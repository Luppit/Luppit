import { useConversationLayout } from "./_layout";
import { Text } from "@/src/components/Text";
import {
  ConversationMessage,
  getConversationMessagesByConversationId,
} from "@/src/services/conversation.message.service";
import { useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, View } from "react-native";

export default function ConversationChatScreen() {
  const t = useTheme();
  const { conversationId, profileId, messageRefreshTick } = useConversationLayout();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const imageMessageWidth = 230;

  const loadMessages = useCallback(async () => {
    const result = await getConversationMessagesByConversationId(conversationId);
    if (!result.ok) return;
    setMessages(result.data);
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      void loadMessages();
    }, [loadMessages])
  );

  useEffect(() => {
    void loadMessages();
  }, [messageRefreshTick, loadMessages]);

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <ScrollView
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingVertical: t.spacing.md,
        gap: t.spacing.md,
        paddingBottom: t.spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((message) => {
        const messageKind = (message.message_kind ?? "").toUpperCase();
        const imageUri =
          (message.image_url as string | null | undefined) ??
          ((message as any).imageUrl as string | null | undefined) ??
          null;
        const isImageMessage = messageKind === "IMAGE" || Boolean(imageUri);

        return (
          <View
            key={message.id}
            style={{
              alignSelf:
                message.sender_profile_id === profileId ? "flex-end" : "flex-start",
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
                style={{ width: imageMessageWidth, height: 170, borderRadius: t.borders.sm }}
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
    </ScrollView>
  );
}
