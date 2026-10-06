import ConversationFloatingCard from "@/src/components/conversation/ConversationFloatingCard";
import useConversationScroll from "@/src/components/conversation/useConversationScroll";
import GlassSurface from "@/src/components/glass/GlassSurface";
import ConversationOfferDetails from "@/src/components/conversation/ConversationOfferDetails";
import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import MessageUtilities from "@/src/components/message/MessageUtilities";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Text } from "@/src/components/Text";
import {
  ConversationMessage,
  getConversationMessagesByConversationId,
} from "@/src/services/conversation.message.service";
import { getCurrentProfileConversationById } from "@/src/services/conversation.service";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "@/src/themes";
import {
  buildConversationMessageRenderGroups,
  getConversationMessageLogicalKey,
  getConversationRenderImageUri,
} from "@/src/utils/conversationMessageGroup";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConversationLayout } from "./_layout";

type ConversationImagePreview = {
  id: string;
  uri: string;
};

type ConversationRenderItem =
  | { type: "message"; message: ConversationMessage }
  | {
      type: "messageGroup";
      message: ConversationMessage;
      images: ConversationImagePreview[];
    };

function normalizeDisplayName(value: string | null | undefined) {
  const name = value?.trim() ?? "";
  const normalized = name.toLowerCase();
  if (!name || normalized === "comprador" || normalized === "vendedor") return null;
  if (normalized === "contacto" || normalized === "negocio") return null;
  return name;
}

async function getCounterpartDisplayNameByConversationId(conversationId: string) {
  const result = await getCurrentProfileConversationById(conversationId);
  if (!result.ok) return null;
  return normalizeDisplayName(result.data.display_name);
}

export default function ConversationChatScreen() {
  const t = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { activeProfile, refreshUnreadNotificationCount } = useActiveProfile();
  const isFocused = useIsFocused();
  const {
    conversationId,
    profileId,
    conversationView,
    messageRefreshTick,
    optimisticMessages,
    clearOptimisticMessages,
    handleActionPress,
    isExecutingAction,
    executingActionId,
    cardExpansion,
  } = useConversationLayout();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [senderNameById, setSenderNameById] = useState<Record<string, string>>({});
  const [counterpartDisplayName, setCounterpartDisplayName] = useState<string | null>(
    null
  );
  const [previewImages, setPreviewImages] = useState<ConversationImagePreview[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [cardViewportHeight, setCardViewportHeight] = useState(0);
  const [summaryHeight, setSummaryHeight] = useState(0);
  const [compactCardHeight, setCompactCardHeight] = useState(0);
  const hideSummaryForKeyboard = cardExpansion.keyboardVisible && fontScale > 1.3;
  const visibleSummaryHeight = hideSummaryForKeyboard ? 0 : summaryHeight;
  const resetCardExpansion = cardExpansion.reset;
  useEffect(() => {
    if (isFocused) resetCardExpansion();
  }, [conversationId, profileId, isFocused, resetCardExpansion]);
  const expandHistory = useCallback(() => setHistoryExpanded(true), []);
  const scroll = useConversationScroll(`${conversationId}:${profileId}`, historyExpanded, expandHistory);
  const { scrollViewRef, atBottomRef, scrollToBottom: navigateToBottom } = scroll;
  const prefetchedPreviewUrisRef = React.useRef<Set<string>>(new Set());
  const imageMessageWidth = Math.max(1, Math.min(230,
    (width - t.spacing.md * 2) * 0.88 - t.spacing.md * 2));
  const loadGenerationRef = React.useRef(0);
  const historyLoadedRef = React.useRef(false);
  const previousMessageKeysRef = React.useRef<Set<string>>(new Set());
  const visibleMessages = useMemo(() => {
    const seenKeys = new Set<string>();

    return [...messages, ...optimisticMessages]
      .filter((message) => {
        const key = getConversationMessageLogicalKey(message);
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });
  }, [messages, optimisticMessages]);

  const renderItems = useMemo<ConversationRenderItem[]>(() => {
    return buildConversationMessageRenderGroups(visibleMessages).map((group) => {
      if (group.type === "message") {
        return { type: "message", message: group.messages[0] };
      }
      const message =
        group.messages.find((candidate) => candidate.text?.trim()) ??
        group.messages[0];
      return {
        type: "messageGroup",
        message,
        images: group.messages.flatMap((candidate) => {
          const uri = getConversationRenderImageUri(candidate);
          return uri ? [{ id: candidate.id, uri }] : [];
        }),
      };
    });
  }, [visibleMessages]);
  const activePreviewImage = previewImages[previewIndex] ?? null;
  const scrollToBottom = useCallback((animated = false) => {
    navigateToBottom(animated);
    setNewMessageCount(0);
  }, [navigateToBottom]);

  const loadMessages = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setIsLoadingMessages(true);
    try {
      const result = await getConversationMessagesByConversationId(conversationId);
      if (generation !== loadGenerationRef.current) return;
      if (!result.ok) {
        setMessageError(result.error.message);
        return;
      }
      setMessageError(null);
      setMessages(result.data);
      clearOptimisticMessages(result.data.map((message) => message.id));
      if (activeProfile?.role === "seller") void refreshUnreadNotificationCount();
    } catch {
      if (generation === loadGenerationRef.current) {
        setMessageError("No se pudieron cargar los mensajes. Intenta de nuevo.");
      }
    } finally {
      if (generation === loadGenerationRef.current) setIsLoadingMessages(false);
    }
  }, [activeProfile?.role, conversationId, clearOptimisticMessages, refreshUnreadNotificationCount]);

  useEffect(() => {
    setMessages([]);
    setMessageError(null);
    setPreviewImages([]);
    setCounterpartDisplayName(null);
    setHistoryExpanded(true);
    setNewMessageCount(0);
    atBottomRef.current = false;
    historyLoadedRef.current = false;
    previousMessageKeysRef.current.clear();
  }, [conversationId, profileId, atBottomRef]);

  useEffect(() => {
    if (isFocused) void loadMessages();
    return () => { loadGenerationRef.current += 1; };
  }, [isFocused, profileId, messageRefreshTick, loadMessages]);

  useEffect(() => {
    const previous = previousMessageKeysRef.current;
    const incoming = visibleMessages.filter((message) =>
      (message.message_kind ?? "TEXT").toUpperCase() !== "SYSTEM" &&
      !previous.has(getConversationMessageLogicalKey(message)));
    previousMessageKeysRef.current = new Set(visibleMessages.map(getConversationMessageLogicalKey));
    const initialLoad = !historyLoadedRef.current;
    if (!isLoadingMessages) historyLoadedRef.current = true;
    if (incoming.length === 0) return;
    if (incoming.some((message) => message.id.startsWith("optimistic-") && message.sender_profile_id === profileId)) {
      scrollToBottom();
    } else if (initialLoad) {
      return;
    } else if (atBottomRef.current && historyExpanded) {
      scrollToBottom();
    } else {
      setNewMessageCount((count) => count + incoming.length);
    }
  }, [visibleMessages, profileId, historyExpanded, isLoadingMessages, scrollToBottom, atBottomRef]);

  useEffect(() => {
    let active = true;

    const loadCounterpartDisplayName = async () => {
      const name =
        await getCounterpartDisplayNameByConversationId(conversationId);
      if (active) setCounterpartDisplayName(name);
    };

    void loadCounterpartDisplayName();

    return () => {
      active = false;
    };
  }, [conversationId, profileId]);

  useEffect(() => {
    const senderIds = Array.from(
      new Set(
        visibleMessages
          .map((message) => message.sender_profile_id)
          .filter(
            (senderId): senderId is string =>
              Boolean(senderId) && senderId !== profileId
          )
      )
    );

    if (senderIds.length === 0) {
      setSenderNameById({});
      return;
    }

    if (!counterpartDisplayName) {
      setSenderNameById({});
      return;
    }

    setSenderNameById(
      senderIds.reduce<Record<string, string>>((acc, senderId) => {
        acc[senderId] = counterpartDisplayName;
        return acc;
      }, {})
    );
  }, [counterpartDisplayName, visibleMessages, profileId]);

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const formatSystemDate = (date: string) => {
    const parts = new Intl.DateTimeFormat("es-CR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).formatToParts(new Date(date));

    const day = parts.find((part) => part.type === "day")?.value ?? "";
    const monthRaw = parts.find((part) => part.type === "month")?.value ?? "";
    const year = parts.find((part) => part.type === "year")?.value ?? "";
    const month = monthRaw
      ? `${monthRaw.charAt(0).toUpperCase()}${monthRaw.slice(1).toLowerCase()}`
      : "";

    return `${day} ${month}, ${year}`.trim();
  };

  const prefetchPreviewImages = useCallback(
    (images: ConversationImagePreview[], centerIndex = 0) => {
      if (images.length === 0) return;

      const orderedImages = [
        images[centerIndex],
        images[(centerIndex + 1) % images.length],
        images[(centerIndex - 1 + images.length) % images.length],
        ...images,
      ].filter((image): image is ConversationImagePreview =>
        Boolean(image?.uri)
      );

      for (const image of orderedImages) {
        if (prefetchedPreviewUrisRef.current.has(image.uri)) continue;

        prefetchedPreviewUrisRef.current.add(image.uri);
        void Image.prefetch(image.uri).catch(() => {
          prefetchedPreviewUrisRef.current.delete(image.uri);
        });
      }
    },
    []
  );

  const openImagePreview = useCallback(
    (images: ConversationImagePreview[], index: number) => {
      prefetchPreviewImages(images, index);
      setPreviewImages(images);
      setPreviewIndex(index);
    },
    [prefetchPreviewImages]
  );

  const closeImagePreview = useCallback(() => {
    setPreviewImages([]);
    setPreviewIndex(0);
  }, []);

  const showPreviousPreviewImage = useCallback(() => {
    setPreviewIndex((current) => {
      if (previewImages.length === 0) return 0;

      const nextIndex =
        (current - 1 + previewImages.length) % previewImages.length;
      prefetchPreviewImages(previewImages, nextIndex);
      return nextIndex;
    });
  }, [prefetchPreviewImages, previewImages]);

  const showNextPreviewImage = useCallback(() => {
    setPreviewIndex((current) => {
      if (previewImages.length === 0) return 0;

      const nextIndex = (current + 1) % previewImages.length;
      prefetchPreviewImages(previewImages, nextIndex);
      return nextIndex;
    });
  }, [prefetchPreviewImages, previewImages]);

  const fallbackSenderLabel = useMemo(() => {
    if (counterpartDisplayName) return counterpartDisplayName;

    const roleCode = conversationView.role_code.toLowerCase();
    if (roleCode.includes("buyer")) return "Vendedor";
    if (roleCode.includes("seller")) return "Comprador";
    return "Contacto";
  }, [conversationView.role_code, counterpartDisplayName]);

  const openCounterpartProfile = useCallback(() => {
    const isBuyer = conversationView.role_code.toUpperCase().includes("BUYER");
    router.push({
      pathname: isBuyer
        ? "/(detail)/seller-business"
        : "/(detail)/buyer-profile",
      params: {
        conversationId,
        title: isBuyer ? "Negocio" : "Perfil del comprador",
      },
    });
  }, [conversationId, conversationView.role_code]);

  const renderImageTile = (
    image: ConversationImagePreview,
    images: ConversationImagePreview[],
    index: number,
    style: StyleProp<ViewStyle>,
    hiddenImageCount = 0
  ) => (
    <Pressable
      key={image.id}
      onPress={() => openImagePreview(images, index)}
      accessibilityRole="button"
      accessibilityLabel={`Ver imagen ${index + 1} de ${images.length}`}
      style={[
        {
          overflow: "hidden",
          borderRadius: t.borders.sm,
          backgroundColor: t.colors.border,
        },
        style,
      ]}
    >
      <Image
        source={{ uri: image.uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
      {hiddenImageCount > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.36)",
          }}
        >
          <Text variant="body" style={{ color: t.colors.backgroudWhite }}>
            +{hiddenImageCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  const renderImageBundle = (images: ConversationImagePreview[]) => {
    if (images.length === 2) {
      return (
        <View
          style={{
            width: imageMessageWidth,
            height: 170,
            flexDirection: "row",
            gap: t.spacing.xs,
          }}
        >
          {images.map((image, index) =>
            renderImageTile(image, images, index, { flex: 1 })
          )}
        </View>
      );
    }

    const visibleImages = images.slice(0, 3);
    const hiddenImageCount = Math.max(images.length - visibleImages.length, 0);

    return (
      <View
        style={{
          width: imageMessageWidth,
          height: 170,
          flexDirection: "row",
          gap: t.spacing.xs,
        }}
      >
        {renderImageTile(visibleImages[0], images, 0, { flex: 1.45 })}
        <View style={{ flex: 1, gap: t.spacing.xs }}>
          {visibleImages[1]
            ? renderImageTile(visibleImages[1], images, 1, { flex: 1 })
            : null}
          {visibleImages[2]
            ? renderImageTile(
                visibleImages[2],
                images,
                2,
                { flex: 1 },
                hiddenImageCount
              )
            : null}
        </View>
      </View>
    );
  };

  const renderConversationMessage = (
    message: ConversationMessage,
    imageGroup?: ConversationImagePreview[]
  ) => {
    const messageKind = (message.message_kind ?? "").toUpperCase();
    const imageUri = getConversationRenderImageUri(message, imageGroup);
    const isSystemMessage = messageKind === "SYSTEM";
    const isImageMessage = messageKind === "IMAGE" || Boolean(imageUri);
    const isOwnMessage = message.sender_profile_id === profileId;
    const isPending = message.id.startsWith("optimistic-");
    const senderName =
      message.sender_profile_id != null
        ? senderNameById[message.sender_profile_id] ?? fallbackSenderLabel
        : fallbackSenderLabel;

    if (isSystemMessage) {
      return (
        <View key={message.id} style={{ alignSelf: "stretch", gap: t.spacing.xs, paddingVertical: t.spacing.sm }}>
          {message.text ? <Text variant="body" color="textMedium" align="center" selectable>{message.text}</Text> : null}
          <Text variant="small" color="textMedium" align="center">{formatTime(message.created_at)}</Text>
        </View>
      );
    }

    return (
      <View
        key={message.id}
        style={{
          alignSelf: isOwnMessage ? "flex-end" : "flex-start",
          maxWidth: "88%",
          gap: t.spacing.xs,
        }}
      >
        {isOwnMessage ? (
          <View
            style={{
              alignItems: "flex-end",
              paddingHorizontal: t.spacing.xs,
            }}
          >
            <Text variant="small" color="textDark" align="right">
              {isPending ? "Enviando..." : formatTime(message.created_at)}
            </Text>
          </View>
        ) : null}

        {!isOwnMessage ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: t.spacing.xs,
              paddingHorizontal: t.spacing.xs,
            }}
          >
            <Pressable
              onPress={openCounterpartProfile}
              accessibilityRole="link"
              accessibilityLabel={`Ver perfil de ${senderName}`}
              hitSlop={8}
              style={{ flexShrink: 1 }}
            >
              <Text variant="small" color="textMedium">
                {senderName}
              </Text>
            </Pressable>
            <Text variant="small" color="stateAnulated" style={{ flexShrink: 0 }}>
              {formatTime(message.created_at)}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            borderWidth: isOwnMessage ? 0 : 1,
            borderColor: t.colors.border,
            borderRadius: t.borders.md,
            paddingHorizontal: t.spacing.md,
            paddingTop: t.spacing.md,
            paddingBottom: t.spacing.md,
            backgroundColor: isOwnMessage
              ? t.colors.primaryLight
              : t.colors.backgroudWhite,
            gap: t.spacing.xs,
          }}
        >
          {message.text ? (
            <Text variant="body" color="textDark">
              {message.text}
            </Text>
          ) : null}
          {imageGroup && imageGroup.length > 1 ? (
            renderImageBundle(imageGroup)
          ) : isImageMessage && imageUri ? (
            <Pressable
              onPress={() =>
                openImagePreview([{ id: message.id, uri: imageUri }], 0)
              }
              accessibilityRole="button"
              accessibilityLabel="Ver imagen"
            >
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: imageMessageWidth,
                  height: 170,
                  borderRadius: t.borders.sm,
                }}
                resizeMode="cover"
              />
            </Pressable>
          ) : null}
        </View>
        {!isPending ? (
          <MessageUtilities
            text={message.text}
            align={isOwnMessage ? "right" : "left"}
          />
        ) : null}
      </View>
    );
  };

  return (
    <>
      <View onLayout={(event) => setSummaryHeight(event.nativeEvent.layout.height)}
        style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 6, backgroundColor: "transparent",
          display: hideSummaryForKeyboard ? "none" : "flex",
          paddingHorizontal: t.spacing.md, paddingTop: t.spacing.md, paddingBottom: t.spacing.sm }}>
        <ConversationOfferDetails view={conversationView} profileId={profileId} disabled={isExecutingAction} />
      </View>
      <View pointerEvents="box-none" style={{ position: "absolute", top: visibleSummaryHeight,
        left: t.spacing.sm, right: t.spacing.sm, zIndex: 5, backgroundColor: "transparent" }}>
        <ConversationFloatingCard view={conversationView} disabled={isExecutingAction}
          loadingActionId={executingActionId} onPress={handleActionPress}
          expanded={cardExpansion.expanded} onToggle={cardExpansion.toggle}
          reduceMotion={cardExpansion.reduceMotion} maxHeight={Math.max(0, cardViewportHeight - t.spacing.md)}
          onCompactLayout={(event) => setCompactCardHeight(event.nativeEvent.layout.height)} />
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, backgroundColor: "transparent" }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: t.spacing.md,
          paddingTop: visibleSummaryHeight + compactCardHeight + t.spacing.sm + t.spacing.md,
          paddingBottom: t.spacing.xl, gap: t.spacing.md }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onLayout={(event) => {
          scroll.onLayout(event);
          setCardViewportHeight(event.nativeEvent.layout.height - visibleSummaryHeight);
        }}
        onScrollBeginDrag={() => {
          cardExpansion.collapse();
          scroll.onScrollBeginDrag();
        }}
        onScroll={(event) => {
          scroll.onScroll(event);
          if (atBottomRef.current && historyExpanded) setNewMessageCount(0);
        }}
        onContentSizeChange={scroll.onContentSizeChange}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.sm }}>
          <Text variant="body" style={{ flex: 1, fontFamily: t.typography.subtitle.fontFamily }}>
            {conversationView.presentation?.history_label ?? "Conversación"}
          </Text>
          {renderItems.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: historyExpanded }}
              onPress={() => { scroll.toggleHistory(); setHistoryExpanded((current) => !current); }}
              style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: t.spacing.xs }}>
              <Text variant="small" color="textMedium">
                {historyExpanded
                  ? conversationView.presentation?.history_collapse_label ?? "Ocultar mensajes"
                  : conversationView.presentation?.history_expand_label ?? "Mostrar mensajes"}
              </Text>
              <Icon name={historyExpanded ? "chevron-up" : "chevron-down"} size={18} />
            </Pressable>
          ) : null}
        </View>
        {messageError ? (
          <View style={{ gap: t.spacing.sm }}>
            <Text variant="body" accessibilityRole="alert" selectable>{messageError}</Text>
            <Button title="Reintentar" onPress={() => void loadMessages()} />
          </View>
        ) : null}
        {isLoadingMessages && visibleMessages.length === 0 ? (
          <LoadingState label="Cargando mensajes..." variant="inline" style={{ minHeight: 120 }} />
        ) : null}
        {!isLoadingMessages && !messageError && renderItems.length === 0 ? (
          <View style={{ paddingVertical: t.spacing.lg, alignItems: "center", gap: t.spacing.sm }}>
            <Icon name="message-square" size={28} color={t.colors.textMedium} />
            <Text variant="body">Aún no hay mensajes</Text>
            <Text variant="small" color="textMedium" align="center">Aquí aparecerán los mensajes de esta conversación.</Text>
          </View>
        ) : null}
        {historyExpanded ? renderItems.map((item, index) => {
          const date = formatSystemDate(item.message.created_at);
          const previousDate = index > 0 ? formatSystemDate(renderItems[index - 1].message.created_at) : null;
          return (
            <React.Fragment key={item.message.id}>
              {date !== previousDate ? (
                <Text variant="small" color="textMedium" align="center" style={{ paddingVertical: t.spacing.sm }}>{date}</Text>
              ) : null}
              {item.type === "messageGroup"
                ? renderConversationMessage(item.message, item.images)
                : renderConversationMessage(item.message)}
            </React.Fragment>
          );
        }) : null}
      </ScrollView>
      {!cardExpansion.expanded && renderItems.length > 0 &&
        (!historyExpanded || scroll.destinations.latest || newMessageCount > 0) ? (
        <View style={{ position: "absolute", bottom: t.spacing.sm, right: t.spacing.md, zIndex: 4 }}>
          <GlassSurface variant="control" style={{ borderRadius: t.glass.radius.chip }}>
            <Pressable accessibilityRole="button"
              accessibilityLabel={`${newMessageCount > 0 ? `${newMessageCount} ${newMessageCount === 1 ? "mensaje nuevo" : "mensajes nuevos"}. ` : ""}Ir a los últimos mensajes`}
              onPress={() => {
                scroll.scrollToBottom(true, conversationView.presentation?.navigation_latest_label ?? "Últimos mensajes");
                setNewMessageCount(0);
              }}
              style={{ minWidth: 48, minHeight: 48, padding: t.spacing.sm, flexDirection: "row",
                alignItems: "center", justifyContent: "center", gap: t.spacing.xs }}>
              <Icon name="chevron-down" size={18} />
              {newMessageCount > 0 ? <Text variant="small" style={{ flexShrink: 1 }}>
                {`${newMessageCount} ${newMessageCount === 1
                  ? conversationView.presentation?.navigation_new_singular_label ?? "nuevo"
                  : conversationView.presentation?.navigation_new_label ?? "nuevos"}`}
              </Text> : null}
            </Pressable>
          </GlassSurface>
        </View>
      ) : null}

      <Modal
        visible={Boolean(activePreviewImage)}
        transparent
        animationType="fade"
        onRequestClose={closeImagePreview}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.92)",
            justifyContent: "center",
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.xl,
          }}
        >
          <Pressable
            onPress={closeImagePreview}
            accessibilityRole="button"
            accessibilityLabel="Cerrar imagen"
            hitSlop={12}
            style={{
              position: "absolute",
              top: insets.top + t.spacing.sm,
              right: t.spacing.lg,
              zIndex: 2,
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.16)",
            }}
          >
            <Icon name="x" size={24} color={t.colors.backgroudWhite} />
          </Pressable>

          {activePreviewImage ? (
            <View
              style={{
                width: "100%",
                height: "82%",
              }}
            >
              {previewImages.map((image, index) => (
                <Image
                  key={image.id}
                  source={{ uri: image.uri }}
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    opacity: index === previewIndex ? 1 : 0,
                  }}
                  resizeMode="contain"
                />
              ))}
            </View>
          ) : null}

          {previewImages.length > 1 ? (
            <>
              <Pressable
                onPress={showPreviousPreviewImage}
                accessibilityRole="button"
                accessibilityLabel="Imagen anterior"
                hitSlop={12}
                style={{
                  position: "absolute",
                  left: t.spacing.md,
                  top: "48%",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.16)",
                }}
              >
                <Icon
                  name="arrow-left"
                  size={24}
                  color={t.colors.backgroudWhite}
                />
              </Pressable>
              <Pressable
                onPress={showNextPreviewImage}
                accessibilityRole="button"
                accessibilityLabel="Imagen siguiente"
                hitSlop={12}
                style={{
                  position: "absolute",
                  right: t.spacing.md,
                  top: "48%",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.16)",
                }}
              >
                <Icon
                  name="arrow-right"
                  size={24}
                  color={t.colors.backgroudWhite}
                />
              </Pressable>
              <Text
                variant="small"
                align="center"
                style={{
                  color: t.colors.backgroudWhite,
                  position: "absolute",
                  bottom: Math.max(insets.bottom, t.spacing.xl),
                  alignSelf: "center",
                }}
              >
                {previewIndex + 1} / {previewImages.length}
              </Text>
            </>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
