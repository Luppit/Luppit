import {
  useChatSession,
} from "@/src/components/chatLayout/ChatSessionContext";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { Image, ScrollView, View } from "react-native";

export default function ChatScreen() {
  const t = useTheme();
  const { messages } = useChatSession();

  if (messages.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: t.spacing.md,
        }}
      >
        <Image
          source={require("../../assets/images/icon.png")}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
        />
        <Text variant="body" align="center">
          ¿Qué estás buscando hoy?
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingVertical: t.spacing.md, gap: t.spacing.sm }}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((message) => (
        <View
          key={message.id}
          style={{
            maxWidth: "88%",
            alignSelf: message.sender === "user" ? "flex-end" : "flex-start",
            borderRadius: t.borders.md,
            paddingHorizontal: t.spacing.md,
            paddingVertical: t.spacing.sm,
            backgroundColor:
              message.sender === "user"
                ? t.colors.primaryLight
                : t.colors.backgroudWhite,
          }}
        >
          <Text variant="body">{message.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
