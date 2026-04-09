import Button from "@/src/components/button/Button";
import { Text } from "@/src/components/Text";
import {
  ConversationMessage,
  getConversationMessagesByConversationId,
} from "@/src/services/conversation.message.service";
import { useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
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
  const scrollViewRef = React.useRef<ScrollView | null>(null);
  const imageMessageWidth = 230;
  const showComposer = conversationView.permissions.can_send_messages;
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

  return (
    <ScrollView
      ref={scrollViewRef}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingVertical: t.spacing.md,
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
              alignSelf:
                message.sender_profile_id === profileId
                  ? "flex-end"
                  : "flex-start",
              maxWidth: "88%",
              borderWidth: message.sender_profile_id === profileId ? 0 : 1,
              borderColor: t.colors.border,
              borderRadius: t.borders.md,
              padding: t.spacing.md,
              backgroundColor:
                message.sender_profile_id === profileId
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
            <Text
              variant="caption"
              color="stateAnulated"
              align="right"
              style={{ marginTop: 2 }}
            >
              {formatTime(message.created_at)}
            </Text>
          </View>
        );
      })}

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
