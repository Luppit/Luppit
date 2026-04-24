import {
  useChatSession,
} from "./chat-session.context";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import React from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";

function AssistantTextBlock({ text }: { text: string }) {
  return (
    <View style={{ maxWidth: "96%", alignSelf: "flex-start" }}>
      <Text variant="body">{text}</Text>
    </View>
  );
}

function PublishRequestCard({
  title,
  description,
  disabled,
  onPublish,
}: {
  title: string;
  description: string;
  disabled: boolean;
  onPublish: () => void;
}) {
  const t = useTheme();

  return (
    <View
      style={{
        alignSelf: "stretch",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.backgroudWhite,
        padding: t.spacing.sm,
        gap: t.spacing.sm,
      }}
    >
      <View style={{ gap: t.spacing.xs }}>
        <Text variant="body" color="stateAnulated">
          Título:
        </Text>
        <Text variant="body">{title}</Text>
      </View>

      <View style={{ gap: t.spacing.xs }}>
        <Text variant="body" color="stateAnulated">
          Descripción
        </Text>
        <Text variant="body">{description}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPublish}
        style={({ pressed }) => ({
          minHeight: 44,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: disabled ? t.colors.border : t.colors.primary,
          opacity: pressed && !disabled ? 0.92 : 1,
          paddingHorizontal: t.spacing.md,
        })}
      >
        <Text
          variant="body"
          style={{ color: t.colors.backgroudWhite }}
        >
          ✓ Publicar solicitud
        </Text>
      </Pressable>
    </View>
  );
}

export default function ChatScreen() {
  const t = useTheme();
  const logoAsset = Asset.fromModule(require("../../assets/images/logo-icon.svg"));
  const {
    messages,
    uiState,
    canPublish,
    isExecutingControl,
    summary,
    summaryText,
    publishDraft,
    status,
  } = useChatSession();

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
        {logoAsset.uri ? (
          <SvgUri uri={logoAsset.uri} width={64} height={64} />
        ) : (
          <Image
            source={require("../../assets/images/icon.png")}
            style={{ width: 64, height: 64 }}
            resizeMode="contain"
          />
        )}
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
      contentContainerStyle={{
        paddingTop: t.spacing.sm,
        gap: t.spacing.sm,
        paddingBottom: t.spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((message) => (
        message.sender === "user" ? (
          <View
            key={message.id}
            style={{
              maxWidth: "88%",
              alignSelf: "flex-end",
              borderRadius: t.borders.md,
              paddingHorizontal: t.spacing.md,
              paddingVertical: t.spacing.sm,
              backgroundColor: t.colors.primaryLight,
            }}
          >
            <Text variant="body">{message.text}</Text>
          </View>
        ) : (
          <AssistantTextBlock key={message.id} text={message.text} />
        )
      ))}

      {uiState === "review" ? (
        <>
          <AssistantTextBlock text="Aquí tienes el resumen de tu solicitud. Revisa que toda la información sea correcta antes de continuar." />
          <PublishRequestCard
            title={summary?.titulo ?? "Solicitud"}
            description={summaryText ?? "Sin descripción"}
            disabled={!canPublish || isExecutingControl}
            onPublish={() => void publishDraft()}
          />
          {status === "published" ? (
            <AssistantTextBlock text="Esta solicitud ya fue publicada." />
          ) : (
            <AssistantTextBlock text="Si deseas ajustar algo, puedes decírmelo ahora. Cuando estés listo, pulsa Publicar solicitud para enviarla a los proveedores." />
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
