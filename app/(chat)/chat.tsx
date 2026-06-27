import {
  useChatSession,
} from "./chat-session.context";
import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import type { PurchaseRequestAssistantSummary } from "@/src/services/purchase.request.assistant.service";
import { useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import React, { useEffect, useRef } from "react";
import { Animated, Image, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CHAT_TOP_BAR_VISIBLE_HEIGHT } from "./chat-top-bar";

function AssistantTextBlock({ text }: { text: string }) {
  const t = useTheme();

  return (
    <View style={{ maxWidth: "96%", alignSelf: "flex-start", paddingVertical: t.spacing.xs }}>
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

function hasSummaryValue(value: string | number | null | undefined) {
  return value !== null && value !== undefined && value !== "";
}

function formatSummaryValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) {
    const formatted = value
      .map(formatSummaryValue)
      .filter((item): item is string => Boolean(item));
    return formatted.length > 0 ? formatted.join(", ") : null;
  }
  return null;
}

function humanizeAttributeLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function SummaryDetailPill({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const t = useTheme();
  const displayValue = String(value);

  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: "47%",
        borderRadius: 16,
        backgroundColor: t.colors.background,
        paddingHorizontal: t.spacing.sm,
        paddingVertical: t.spacing.sm,
        gap: 2,
      }}
    >
      <Text variant="caption" color="stateAnulated">
        {label}
      </Text>
      <Text variant="body" maxLines={2}>
        {displayValue}
      </Text>
    </View>
  );
}

function PublishRequestCard({
  summary,
  description,
  disabled,
  continueDisabled,
  loading,
  onPublish,
  onContinue,
}: {
  summary: PurchaseRequestAssistantSummary | null;
  description: string | null;
  disabled: boolean;
  continueDisabled: boolean;
  loading: boolean;
  onPublish: () => void;
  onContinue: () => void;
}) {
  const t = useTheme();
  const attributeDetails = Object.entries(summary?.atributos ?? {})
    .map(([label, value]) => ({
      label: humanizeAttributeLabel(label),
      value: formatSummaryValue(value),
    }))
    .filter((item) => hasSummaryValue(item.value));
  const details = [
    { label: "Categoría", value: summary?.categoria },
    {
      label: "Marca",
      value: summary?.marca && summary.marca.length > 0
        ? summary.marca.join(", ")
        : null,
    },
    ...attributeDetails,
  ].filter((item) => hasSummaryValue(item.value));

  return (
    <View
      style={{
        alignSelf: "stretch",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.backgroudWhite,
        padding: t.spacing.md,
        gap: t.spacing.md,
        shadowColor: t.colors.shadow,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: t.spacing.sm,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: t.colors.primaryLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="sparkles" size={22} color={t.colors.primary} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" color="textDark">
            Solicitud lista
          </Text>
          <Text variant="body">Revisa el resumen antes de publicarla</Text>
          <Text variant="caption" color="stateAnulated">
            Confirma producto, categoría y detalles.
          </Text>
        </View>
      </View>

      <View style={{ gap: t.spacing.sm }}>
        <Text variant="label" color="stateAnulated">
          Resumen de la solicitud
        </Text>
        <Text variant="subtitle">{summary?.titulo ?? "Solicitud"}</Text>
        {description ? (
          <Text variant="body">{description}</Text>
        ) : null}
      </View>

      {details.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm }}>
          {details.map((item) => (
            <SummaryDetailPill
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </View>
      ) : null}

      <View style={{ gap: t.spacing.sm }}>
        <Button
          title="Publicar solicitud"
          icon="check"
          variant="dark"
          disabled={disabled}
          loading={loading}
          onPress={onPublish}
        />
        <Button
          title="Seguir ajustando"
          icon="sliders-horizontal"
          variant="white"
          disabled={continueDisabled}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

function EmptyRequestAssistantState() {
  const t = useTheme();
  const logoAsset = Asset.fromModule(require("../../assets/images/logo-icon.svg"));

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
      }}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 999,
          backgroundColor: t.colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {logoAsset.uri ? (
          <SvgUri uri={logoAsset.uri} width={40} height={40} />
        ) : (
          <Image
            source={require("../../assets/images/icon.png")}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        )}
      </View>
      <Text variant="body" align="center">
        ¿Qué estás buscando hoy?
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const {
    messages,
    uiState,
    canPublish,
    isSendingMessage,
    isExecutingControl,
    continueClarifying,
    summary,
    summaryText,
    publishDraft,
    status,
  } = useChatSession();
  const isAssistantBusy = isSendingMessage || isExecutingControl;

  return (
    <ScrollView
      ref={scrollRef}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }}
      contentContainerStyle={{
        paddingTop: insets.top + CHAT_TOP_BAR_VISIBLE_HEIGHT + t.spacing.lg,
        gap: t.spacing.md,
        paddingBottom: t.spacing.lg,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      {messages.length === 0 && !isAssistantBusy ? <EmptyRequestAssistantState /> : null}

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
              gap: t.spacing.xs,
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
            summary={summary}
            description={summaryText}
            disabled={!canPublish || isAssistantBusy}
            continueDisabled={isAssistantBusy}
            loading={isExecutingControl}
            onContinue={() => void continueClarifying()}
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
