import {
  useChatSession,
} from "./chat-session.context";
import type { ChatMessage } from "./chat-session.context";
import AssistantProcessingProgress from "@/src/components/assistant/AssistantProcessingProgress";
import AssistantReviewCard from "@/src/components/assistant/AssistantReviewCard";
import MessageUtilities from "@/src/components/message/MessageUtilities";
import { Text } from "@/src/components/Text";
import type { PurchaseRequestAssistantSummary } from "@/src/services/purchase.request.assistant.service";
import { useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import React, { useEffect, useRef } from "react";
import { Image, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CHAT_TOP_BAR_VISIBLE_HEIGHT } from "./chat-top-bar";

const REQUEST_PROCESSING_STEPS = [
  "Identificando el producto",
  "Organizando los detalles",
  "Preparando el resumen",
] as const;

function AssistantTextBlock({ text }: { text: string }) {
  const t = useTheme();

  return (
    <View
      style={{
        maxWidth: "96%",
        alignSelf: "flex-start",
        paddingVertical: t.spacing.xs,
      }}
    >
      <Text variant="body">{text}</Text>
      <MessageUtilities text={text} />
    </View>
  );
}

function UserMessageBlock({ message }: { message: ChatMessage }) {
  const t = useTheme();
  const { retryMessage, isSendingMessage } = useChatSession();

  return (
    <View
      style={{
        maxWidth: "88%",
        alignSelf: "flex-end",
        gap: t.spacing.xs,
      }}
    >
      <View
        style={{
          borderRadius: t.borders.md,
          paddingHorizontal: t.spacing.md,
          paddingVertical: t.spacing.sm,
          backgroundColor: t.colors.primaryLight,
          gap: t.spacing.xs,
        }}
      >
        {message.text.trim().length > 0 ? (
          <Text variant="body">{message.text}</Text>
        ) : null}

        {message.images && message.images.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing.xs }}>
            {message.images.map((image, index) => (
              <Image
                key={`${image.uri}-${index}`}
                source={{ uri: image.uri }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 16,
                  backgroundColor: t.colors.border,
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
      <MessageUtilities
        text={message.text}
        align="right"
        onRetry={message.failedRequests ? () => void retryMessage(message.id) : undefined}
        retryDisabled={isSendingMessage}
      />
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
    <AssistantReviewCard
      completionTitle="Solicitud lista"
      completionDescription="Revisa los detalles antes de publicar."
      title={summary?.titulo ?? "Solicitud"}
      description={description}
      rows={details.map((item) => ({
        label: item.label,
        value: String(item.value),
      }))}
      primaryLabel="Publicar solicitud"
      primaryDisabled={disabled}
      primaryLoading={loading}
      onPrimaryPress={onPublish}
      secondaryLabel="Seguir ajustando"
      secondaryDisabled={continueDisabled}
      onSecondaryPress={onContinue}
    />
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
    isGeneratingSummary,
    isExecutingControl,
    continueClarifying,
    summary,
    summaryText,
    publishDraft,
    status,
    stopAssistant,
  } = useChatSession();
  const isAssistantBusy = isSendingMessage || isExecutingControl;

  useEffect(() => {
    if (uiState === "review") {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [uiState]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        if (uiState === "review") {
          scrollRef.current?.scrollTo({ y: 0, animated: false });
        } else {
          scrollRef.current?.scrollToEnd({ animated: true });
        }
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

      {uiState === "review" ? (
        <Text variant="body">
          Listo. Revisa que todo esté correcto antes de publicar.
        </Text>
      ) : (
        messages.map((message) =>
          message.sender === "user" ? (
            <UserMessageBlock key={message.id} message={message} />
          ) : (
            <AssistantTextBlock key={message.id} text={message.text} />
          )
        )
      )}

      {isSendingMessage ? (
        <AssistantProcessingProgress
          title="Preparando tu solicitud"
          steps={REQUEST_PROCESSING_STEPS}
          variant={isGeneratingSummary ? "steps" : "thinking"}
          onStop={stopAssistant}
        />
      ) : null}

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
