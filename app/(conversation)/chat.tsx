import { useConversationLayout } from "./_layout";
import { Text } from "@/src/components/Text";
import {
  ConversationMessage,
  getConversationMessages,
} from "@/src/services/conversation.service";
import { getSession } from "@/src/lib/supabase";
import { getProfileByUserId } from "@/src/services/profile.service";
import { getCurrentUserRole } from "@/src/services/user.role.service";
import { Roles } from "@/src/services/role.service";
import { useTheme } from "@/src/themes";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

export default function ConversationChatScreen() {
  const t = useTheme();
  const { purchaseRequest } = useConversationLayout();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentRole, setCurrentRole] = useState<Roles | null>(null);

  useEffect(() => {
    let active = true;

    const loadMessages = async () => {
      const session = await getSession();
      if (!session?.user.id || !active) return;

      const profile = await getProfileByUserId(session.user.id);
      if (!profile || profile.ok === false || !active) return;

      const roleResult = await getCurrentUserRole();
      if (!roleResult.ok || !roleResult.data || !active) return;
      setCurrentRole(roleResult.data as Roles);

      const data = await getConversationMessages({
        purchaseRequestId: purchaseRequest.id,
        profileId: profile.data.id,
        role: roleResult.data as Roles,
      });

      if (active) setMessages(data);
    };

    void loadMessages();

    return () => {
      active = false;
    };
  }, [purchaseRequest.id]);

  const mineSender = currentRole === Roles.SELLER ? "seller" : "buyer";
  const mockReferenceImage = require("../../assets/images/android-icon-foreground.png");

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
      {messages.map((message) => (
        <View
          key={message.id}
          style={{
            alignSelf: message.sender === mineSender ? "flex-end" : "flex-start",
            maxWidth: "88%",
            borderWidth: message.sender === mineSender ? 0 : 1,
            borderColor: t.colors.border,
            borderRadius: t.borders.md,
            padding: t.spacing.md,
            backgroundColor:
              message.sender === mineSender
                ? t.colors.primaryLight
                : t.colors.backgroudWhite,
            gap: t.spacing.sm,
          }}
        >
          {message.imageKey === "mockReference" ? (
            <Image
              source={mockReferenceImage}
              style={{ width: "100%", height: 170, borderRadius: t.borders.sm }}
              contentFit="contain"
            />
          ) : message.imageUrl ? (
            <Image
              source={{ uri: message.imageUrl }}
              style={{ width: "100%", height: 170, borderRadius: t.borders.sm }}
              contentFit="cover"
            />
          ) : null}
          <Text variant="body" color="textDark">
            {message.text}
          </Text>
          <Text color="stateAnulated" align="right">
            {message.createdAt}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
