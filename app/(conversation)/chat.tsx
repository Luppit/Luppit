import Button from "@/src/components/button/Button";
import ConversationStatusSlotCard from "@/src/components/conversation/ConversationStatusSlotCard";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import { getProfileById } from "@/src/services/profile.service";
import {
  ConversationMessage,
  getConversationMessagesByConversationId,
} from "@/src/services/conversation.message.service";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/src/themes";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useConversationLayout } from "./_layout";

type ConversationImagePreview = {
  id: string;
  uri: string;
};

type ConversationRenderItem =
  | { type: "message"; message: ConversationMessage }
  | {
      type: "imageGroup";
      messages: ConversationMessage[];
      images: ConversationImagePreview[];
    };

const imageGroupWindowMs = 2 * 60 * 1000;

const getMessageImageUri = (message: ConversationMessage) =>
  (message.image_url as string | null | undefined) ??
  ((message as any).imageUrl as string | null | undefined) ??
  null;

const isImageOnlyMessage = (message: ConversationMessage) => {
  const messageKind = (message.message_kind ?? "").toUpperCase();
  const imageUri = getMessageImageUri(message);
  return Boolean(imageUri) && messageKind === "IMAGE" && !message.text?.trim();
};

const shouldGroupImageMessages = (
  previousMessage: ConversationMessage,
  nextMessage: ConversationMessage
) => {
  if (nextMessage.sender_profile_id !== previousMessage.sender_profile_id) {
    return false;
  }

  const previousTime = new Date(previousMessage.created_at).getTime();
  const nextTime = new Date(nextMessage.created_at).getTime();
  if (!Number.isFinite(previousTime) || !Number.isFinite(nextTime)) {
    return false;
  }

  return Math.abs(nextTime - previousTime) <= imageGroupWindowMs;
};

export default function ConversationChatScreen() {
  const t = useTheme();
  const {
    conversationId,
    profileId,
    conversationView,
    messageRefreshTick,
    auxActions,
    onActionPress,
    isExecutingAction,
    optimisticMessages,
    clearOptimisticMessages,
  } = useConversationLayout();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [senderNameById, setSenderNameById] = useState<Record<string, string>>({});
  const [previewImages, setPreviewImages] = useState<ConversationImagePreview[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const scrollViewRef = React.useRef<ScrollView | null>(null);
  const prefetchedPreviewUrisRef = React.useRef<Set<string>>(new Set());
  const imageMessageWidth = 230;
  const showComposer = conversationView.permissions.can_send_messages;
  const statusSlots = useMemo(
    () =>
      conversationView.slots.filter(
        (slot) => (slot.ui_slot ?? "").toUpperCase() === "STATUS"
      ),
    [conversationView.slots]
  );
  const visibleMessages = useMemo(() => {
    const seenIds = new Set<string>();

    return [...messages, ...optimisticMessages]
      .filter((message) => {
        if (seenIds.has(message.id)) return false;
        seenIds.add(message.id);
        return true;
      })
      .sort(
        (first, second) =>
          new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
      );
  }, [messages, optimisticMessages]);

  const renderItems = useMemo<ConversationRenderItem[]>(() => {
    const items: ConversationRenderItem[] = [];

    for (let i = 0; i < visibleMessages.length; i += 1) {
      const message = visibleMessages[i];

      if (!isImageOnlyMessage(message)) {
        items.push({ type: "message", message });
        continue;
      }

      const groupedMessages = [message];
      const groupedImages: ConversationImagePreview[] = [
        { id: message.id, uri: getMessageImageUri(message) ?? "" },
      ];

      let nextIndex = i + 1;
      while (nextIndex < visibleMessages.length) {
        const nextMessage = visibleMessages[nextIndex];
        const previousMessage = groupedMessages[groupedMessages.length - 1];
        if (
          !isImageOnlyMessage(nextMessage) ||
          !shouldGroupImageMessages(previousMessage, nextMessage)
        ) {
          break;
        }

        groupedMessages.push(nextMessage);
        groupedImages.push({
          id: nextMessage.id,
          uri: getMessageImageUri(nextMessage) ?? "",
        });
        nextIndex += 1;
      }

      if (groupedMessages.length > 1) {
        items.push({
          type: "imageGroup",
          messages: groupedMessages,
          images: groupedImages,
        });
        i = nextIndex - 1;
      } else {
        items.push({ type: "message", message });
      }
    }

    return items;
  }, [visibleMessages]);
  const activePreviewImage = previewImages[previewIndex] ?? null;
  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      }, 0);
    });
  }, []);

  const loadMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    const result =
      await getConversationMessagesByConversationId(conversationId);
    if (!result.ok) {
      setIsLoadingMessages(false);
      return;
    }

    setMessages(result.data);
    clearOptimisticMessages(result.data.map((message) => message.id));
    setIsLoadingMessages(false);
    if (result.data.length > 0) {
      scrollToBottom(false);
      setTimeout(() => {
        scrollToBottom(false);
      }, 120);
    }
  }, [conversationId, scrollToBottom, clearOptimisticMessages]);

  useFocusEffect(
    useCallback(() => {
      void loadMessages();
    }, [loadMessages]),
  );

  useEffect(() => {
    void loadMessages();
  }, [messageRefreshTick, loadMessages]);

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

    let active = true;

    const loadSenderNames = async () => {
      const entries = await Promise.all(
        senderIds.map(async (senderId) => {
          const profileResult = await getProfileById(senderId);
          if (!profileResult || profileResult.ok === false) return null;

          const name = profileResult.data.name?.trim();
          if (!name) return null;
          return [senderId, name] as const;
        })
      );

      if (!active) return;

      setSenderNameById(
        entries.reduce<Record<string, string>>((acc, entry) => {
          if (!entry) return acc;
          acc[entry[0]] = entry[1];
          return acc;
        }, {})
      );
    };

    void loadSenderNames();

    return () => {
      active = false;
    };
  }, [visibleMessages, profileId]);

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

  const getAuxActionTextColor = (styleCode: string | null) => {
    const value = (styleCode ?? "").toLowerCase().trim();
    const isDanger =
      value.includes("error") ||
      value.includes("danger") ||
      value.includes("destructive") ||
      value.includes("reject") ||
      value.includes("cancel");
    const isPrimary =
      value.includes("primary") ||
      value.includes("success") ||
      value.includes("positive") ||
      value.includes("confirm");

    if (isDanger) return t.colors.error;
    if (isPrimary) return t.colors.primary;
    return t.colors.textDark;
  };

  const isBlackAuxAction = (styleCode: string | null) =>
    (styleCode ?? "").toLowerCase().trim().includes("black");

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
    const roleCode = conversationView.role_code.toLowerCase();
    if (roleCode.includes("buyer")) return "Vendedor";
    if (roleCode.includes("seller")) return "Comprador";
    return "Contacto";
  }, [conversationView.role_code]);

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
    const imageUri = getMessageImageUri(message);
    const isSystemMessage = messageKind === "SYSTEM";
    const isImageMessage = messageKind === "IMAGE" || Boolean(imageUri);
    const isOwnMessage = message.sender_profile_id === profileId;
    const senderName =
      message.sender_profile_id != null
        ? senderNameById[message.sender_profile_id] ?? fallbackSenderLabel
        : fallbackSenderLabel;

    if (isSystemMessage) {
      return (
        <View
          key={message.id}
          style={{
            alignSelf: "stretch",
            alignItems: "center",
            marginVertical: t.spacing.sm,
            gap: t.spacing.md,
          }}
        >
          <View
            style={{
              borderRadius: 999,
              paddingHorizontal: t.spacing.sm + 2,
              paddingVertical: 2,
              backgroundColor: t.colors.border,
            }}
          >
            <Text variant="body" color="textDark" align="center">
              {formatSystemDate(message.created_at)}
            </Text>
          </View>
          {message.text ? (
            <Text variant="body" color="stateAnulated" align="center">
              {message.text}
            </Text>
          ) : null}
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
            <Text variant="caption" color="textDark" align="right">
              {formatTime(message.created_at)}
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
            <Text variant="caption" color="textMedium">
              {senderName}
            </Text>
            <Text variant="caption" color="stateAnulated">
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
          {imageGroup && imageGroup.length > 1 ? (
            renderImageBundle(imageGroup)
          ) : isImageMessage && imageUri ? (
            <Pressable
              onPress={() =>
                openImagePreview([{ id: message.id, uri: imageUri }], 0)
              }
            >
              <Image
                source={{ uri: imageUri }}
                style={{
                  width: imageMessageWidth,
                  height: 170,
                  borderRadius: t.borders.sm,
                }}
                resizeMode="cover"
                onError={(error) => {
                  console.log("conversation image render error", {
                    imageUri,
                    error,
                  });
                }}
              />
            </Pressable>
          ) : null}
          {message.text ? (
            <Text variant="body" color="textDark">
              {message.text}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: t.spacing.sm,
          gap: t.spacing.md,
          paddingBottom: t.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (visibleMessages.length === 0) return;
          scrollToBottom(false);
        }}
      >
        {isLoadingMessages && visibleMessages.length === 0 ? (
          <LoadingState
            label="Cargando mensajes..."
            variant="inline"
            style={{ minHeight: 160 }}
          />
        ) : null}

        {renderItems.map((item) =>
          item.type === "imageGroup"
            ? renderConversationMessage(item.messages[0], item.images)
            : renderConversationMessage(item.message)
        )}

        {statusSlots.map((slot) => (
          <ConversationStatusSlotCard key={slot.code} slot={slot} />
        ))}

        {!showComposer
          ? auxActions.map((action, index) => {
              const isLastAuxAction = index === auxActions.length - 1;
              const auxBottomSpacing =
                showComposer && isLastAuxAction ? t.spacing.sm : 0;

              return isBlackAuxAction(action.style_code) ? (
                <View
                  key={action.id}
                  style={{
                    alignSelf: "stretch",
                    paddingTop: t.spacing.xs,
                    marginBottom: auxBottomSpacing,
                  }}
                >
                  <Button
                    title={action.label}
                    onPress={() => onActionPress(action)}
                    disabled={isExecutingAction}
                    variant="dark"
                  />
                </View>
              ) : (
                <Pressable
                  key={action.id}
                  onPress={() => onActionPress(action)}
                  disabled={isExecutingAction}
                  hitSlop={8}
                  style={{
                    alignSelf: "center",
                    paddingVertical: t.spacing.xs,
                    marginBottom: auxBottomSpacing,
                    opacity: isExecutingAction ? 0.6 : 1,
                  }}
                >
                  <Text
                    variant="body"
                    align="center"
                    style={{ color: getAuxActionTextColor(action.style_code) }}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })
          : null}
      </ScrollView>

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
            hitSlop={12}
            style={{
              position: "absolute",
              top: t.spacing.xl,
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
                variant="caption"
                align="center"
                style={{
                  color: t.colors.backgroudWhite,
                  position: "absolute",
                  bottom: t.spacing.xl,
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
