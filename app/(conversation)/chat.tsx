import Button from "@/src/components/button/Button";
import ConversationStatusSlotCard from "@/src/components/conversation/ConversationStatusSlotCard";
import { Text } from "@/src/components/Text";
import { getProfileById } from "@/src/services/profile.service";
import {
  ConversationMessage,
  getConversationMessagesByConversationId,
} from "@/src/services/conversation.message.service";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/src/themes";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { useConversationLayout } from "./_layout";

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
  } = useConversationLayout();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [senderNameById, setSenderNameById] = useState<Record<string, string>>({});
  const scrollViewRef = React.useRef<ScrollView | null>(null);
  const imageMessageWidth = 230;
  const showComposer = conversationView.permissions.can_send_messages;
  const statusSlots = useMemo(
    () =>
      conversationView.slots.filter(
        (slot) => (slot.ui_slot ?? "").toUpperCase() === "STATUS"
      ),
    [conversationView.slots]
  );
  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated });
      }, 0);
    });
  }, []);

  const loadMessages = useCallback(async () => {
    const result =
      await getConversationMessagesByConversationId(conversationId);
    if (!result.ok) return;
    setMessages(result.data);
    if (result.data.length > 0) {
      scrollToBottom(false);
      setTimeout(() => {
        scrollToBottom(false);
      }, 120);
    }
  }, [conversationId, scrollToBottom]);

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
        messages
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
  }, [messages, profileId]);

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

  const fallbackSenderLabel = useMemo(() => {
    const roleCode = conversationView.role_code.toLowerCase();
    if (roleCode.includes("buyer")) return "Vendedor";
    if (roleCode.includes("seller")) return "Comprador";
    return "Contacto";
  }, [conversationView.role_code]);

  return (
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
        if (messages.length === 0) return;
        scrollToBottom(false);
      }}
    >
      {messages.map((message) => {
        const messageKind = (message.message_kind ?? "").toUpperCase();
        const imageUri =
          (message.image_url as string | null | undefined) ??
          ((message as any).imageUrl as string | null | undefined) ??
          null;
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
              {isImageMessage && imageUri ? (
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
              ) : null}
              {message.text ? (
                <Text variant="body" color="textDark">
                  {message.text}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}

      {statusSlots.map((slot) => (
        <ConversationStatusSlotCard key={slot.code} slot={slot} />
      ))}

      {!showComposer ? auxActions.map((action, index) => {
        const isLastAuxAction = index === auxActions.length - 1;
        const auxBottomSpacing = showComposer && isLastAuxAction ? t.spacing.sm : 0;

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
      }) : null}
    </ScrollView>
  );
}
