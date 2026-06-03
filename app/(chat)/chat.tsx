import {
  useChatSession,
} from "./chat-session.context";
import Button from "@/src/components/button/Button";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import React, { useEffect, useRef } from "react";
import { Animated, Image, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CHAT_TOP_BAR_VISIBLE_HEIGHT } from "./chat-top-bar";

function AssistantTextBlock({ text }: { text: string }) {
  return (
    <View style={{ maxWidth: "96%", alignSelf: "flex-start" }}>
      <Text variant="body">{text}</Text>
    </View>
  );
}

function AssistantThinkingBlock() {
  const t = useTheme();
  const dotOpacities = useRef([
    new Animated.Value(0.35),
    new Animated.Value(0.35),
    new Animated.Value(0.35),
  ]).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.stagger(
        140,
        dotOpacities.map((opacity) =>
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 360,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.35,
              duration: 360,
              useNativeDriver: true,
            }),
          ])
        )
      )
    );

    animation.start();
    return () => animation.stop();
  }, [dotOpacities]);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      accessibilityLabel="Pensando"
      style={{
        maxWidth: "96%",
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.xs,
        paddingVertical: t.spacing.xs,
      }}
    >
      <Text variant="body" color="stateAnulated">
        Pensando
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        {dotOpacities.map((opacity, index) => (
          <Animated.View
            key={index}
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: t.colors.stateAnulated,
              opacity,
              transform: [
                {
                  translateY: opacity.interpolate({
                    inputRange: [0.35, 1],
                    outputRange: [1, -2],
                  }),
                },
              ],
            }}
          />
        ))}
      </View>
    </View>
  );
}

function PublishRequestCard({
  title,
  description,
  disabled,
  loading,
  onPublish,
}: {
  title: string;
  description: string;
  disabled: boolean;
  loading: boolean;
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

      <Button
        title="Publicar solicitud"
        icon="check"
        variant="dark"
        disabled={disabled}
        loading={loading}
        onPress={onPublish}
      />
    </View>
  );
}

export default function ChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const logoAsset = Asset.fromModule(require("../../assets/images/logo-icon.svg"));
  const {
    messages,
    uiState,
    canPublish,
    isSendingMessage,
    isExecutingControl,
    summary,
    summaryText,
    publishDraft,
    status,
  } = useChatSession();
  const isAssistantBusy = isSendingMessage || isExecutingControl;

  if (messages.length === 0 && !isAssistantBusy) {
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
      ref={scrollRef}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }}
      contentContainerStyle={{
        paddingTop: insets.top + CHAT_TOP_BAR_VISIBLE_HEIGHT + t.spacing.sm,
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

      {isAssistantBusy ? <AssistantThinkingBlock /> : null}

      {uiState === "review" ? (
        <>
          <PublishRequestCard
            title={summary?.titulo ?? "Solicitud"}
            description={summaryText ?? "Sin descripción"}
            disabled={!canPublish || isAssistantBusy}
            loading={isExecutingControl}
            onPublish={() => void publishDraft()}
          />
          {status === "published" ? (
            <AssistantTextBlock text="Esta solicitud ya fue publicada." />
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
