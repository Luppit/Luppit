import Button from "@/src/components/button/Button";
import {
  useChatSession,
} from "./chat-session.context";
import type { ChatMessage } from "./chat-session.context";
import AssistantProcessingProgress from "@/src/components/assistant/AssistantProcessingProgress";
import AssistantReviewCard from "@/src/components/assistant/AssistantReviewCard";
import { BundledSvg } from "@/src/components/BundledSvg";
import MessageUtilities from "@/src/components/message/MessageUtilities";
import { Text } from "@/src/components/Text";
import type { PurchaseRequestAssistantSummary } from "@/src/services/purchase.request.assistant.service";
import { useTheme } from "@/src/themes";
import React, { useRef } from "react";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";
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
  isReadyToPublish,
  missingFields,
  disabled,
  continueDisabled,
  loading,
  onPublish,
  onContinue,
}: {
  summary: PurchaseRequestAssistantSummary | null;
  description: string | null;
  isReadyToPublish: boolean;
  missingFields: string[];
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
      completionTitle={isReadyToPublish ? "Solicitud lista" : "Solicitud por completar"}
      completionDescription={isReadyToPublish
        ? "Revisa los detalles antes de publicar."
        : "Completa los datos pendientes para poder publicar."}
      isComplete={isReadyToPublish}
      title={summary?.titulo ?? "Solicitud"}
      description={description}
      rows={details.map((item) => ({
        label: item.label,
        value: String(item.value),
      }))}
      notices={missingFields.length > 0 ? [{
        text: `Falta completar: ${missingFields.map(humanizeAttributeLabel).join(", ")}.`,
        tone: "error",
      }] : []}
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
        <BundledSvg
          asset={require("../../assets/images/logo-icon.svg")}
          width={40}
          height={40}
          fallback={
            <Image
              source={require("../../assets/images/icon.png")}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          }
        />
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
    isRestoring,
    sessionError,
    restoreDraft,
    uiState,
    canPublish,
    isReadyToPublish,
    missingFields,
    isSendingMessage,
    isGeneratingSummary,
    isExecutingControl,
    continueClarifying,
    summary,
    summaryText,
    publishDraft,
    status,
  } = useChatSession();
  const isAssistantBusy = isSendingMessage || isExecutingControl || isRestoring;

  if (isRestoring || sessionError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", gap: t.spacing.md, paddingTop: insets.top + CHAT_TOP_BAR_VISIBLE_HEIGHT }}>
        {isRestoring ? <ActivityIndicator color={t.colors.textDark} /> : null}
        <Text align="center">{isRestoring ? "Cargando tu solicitud…" : sessionError}</Text>
        {sessionError ? <Button title="Reintentar" onPress={() => void restoreDraft()} /> : null}
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
        paddingTop: insets.top + CHAT_TOP_BAR_VISIBLE_HEIGHT + t.spacing.lg,
        gap: t.spacing.md,
        paddingBottom: t.spacing.lg,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      {messages.length === 0 && !isAssistantBusy ? <EmptyRequestAssistantState /> : null}

      {messages.map((message) =>
        message.sender === "user" ? (
          <UserMessageBlock key={message.id} message={message} />
        ) : (
          <AssistantTextBlock key={message.id} text={message.text} />
        )
      )}

      {isSendingMessage ? (
        <AssistantProcessingProgress
          title="Preparando tu solicitud"
          steps={REQUEST_PROCESSING_STEPS}
          variant={isGeneratingSummary ? "steps" : "thinking"}
        />
      ) : null}

      {uiState === "review" ? (
        <>
          <PublishRequestCard
            summary={summary}
            description={summaryText}
            isReadyToPublish={isReadyToPublish}
            missingFields={missingFields}
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
