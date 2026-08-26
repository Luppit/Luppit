import Button from "@/src/components/button/Button";
import AssistantProcessingProgress from "@/src/components/assistant/AssistantProcessingProgress";
import AssistantReviewCard, {
  type AssistantReviewNotice,
} from "@/src/components/assistant/AssistantReviewCard";
import ExpandableInfoCard from "@/src/components/expandableInfoCard/ExpandableInfoCard";
import FilePicker, {
  SelectedFile,
} from "@/src/components/filePicker/FilePicker";
import { Icon } from "@/src/components/Icon";
import InputChat, { type ChatImage } from "@/src/components/inputChat/inputChat";
import MessageUtilities from "@/src/components/message/MessageUtilities";
import OptionsChecklistCard from "@/src/components/optionsChecklistCard/OptionsChecklistCard";
import { Currency, getCurrencies } from "@/src/services/currency.service";
import {
  DeliveryCatalog,
  getDeliveryCatalog,
} from "@/src/services/delivery.catalog.service";
import {
  EditablePurchaseOfferDraft,
  getEditablePurchaseOfferDraftByConversationId,
  updatePurchaseOffer,
  UpdatePurchaseOfferInput,
} from "@/src/services/purchase.offer.service";
import {
  callSellerOfferAssistant,
  createSellerOfferAssistantRequestIdentity,
  SellerOfferAssistantRequest,
  SellerOfferAssistantResult,
  SellerOfferAssistantSummary,
} from "@/src/services/purchase.offer.assistant.service";
import { openPopup } from "@/src/services/popup.service";
import {
  getPurchaseRequestById,
  PurchaseRequest,
} from "@/src/services/purchase.request.service";
import { Text } from "@/src/components/Text";
import LoadingState from "@/src/components/loading/LoadingState";
import { TextField } from "@/src/components/inputField/InputField";
import TextArea from "@/src/components/textArea/TextArea";
import TextFieldWithToggle from "@/src/components/textFieldWithToggle/TextFieldWithToggle";
import { useTheme } from "@/src/themes";
import { showError, showInfo, showSuccess, showWarning } from "@/src/utils/useToast";
import { MODAL_TOP_BAR_HEIGHT } from "./modal-top-bar";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useFocusEffect,
  useNavigation,
  usePreventRemove,
} from "@react-navigation/native";
import {
  AccessibilityInfo,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OfferPurchaseRequest = Pick<PurchaseRequest, "id" | "title">;

function parsePurchaseRequestParam(
  raw: string | string[] | undefined
): OfferPurchaseRequest | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    const parsed = JSON.parse(value) as Partial<PurchaseRequest>;
    if (typeof parsed.id !== "string" || parsed.id.trim().length === 0) return null;

    return {
      id: parsed.id,
      title: typeof parsed.title === "string" ? parsed.title : null,
    };
  } catch {
    return null;
  }
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function shouldOpenSummaryFromReply(value: string) {
  const normalized = normalize(value)
    .replace(/[.,!?¿¡]/g, "")
    .replace(/\s+/g, " ");
  if (!normalized) return false;

  if (
    ["si", "si ok", "si por favor", "yes", "ok", "dale", "claro"].includes(
      normalized
    )
  ) {
    return true;
  }

  return [
    "mostrar resumen",
    "ver resumen",
    "revisar resumen",
    "muestrame el resumen",
    "ensename el resumen",
  ].some((option) => normalized === option || normalized.includes(option));
}

function buildFallbackPurchaseRequest(
  purchaseRequestId: string | null | undefined
): OfferPurchaseRequest | null {
  if (!purchaseRequestId) return null;
  return { id: purchaseRequestId, title: null };
}

type AssistantMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  images?: ChatImage[];
  uiKind?: "ready" | "summary";
};

type PendingAssistantRetry = {
  input: SellerOfferAssistantRequest;
  successfulImageCount: number;
};

const OFFER_PROCESSING_STEPS = [
  "Revisando el producto",
  "Organizando precio y entrega",
  "Preparando el resumen",
] as const;

function normalizeCurrency(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatSummaryMoney(
  amount: number | null | undefined,
  currency: string | null | undefined
) {
  if (amount == null || !Number.isFinite(amount)) return null;
  const currencyCode = normalizeCurrency(currency);
  const prefix = currencyCode === "usd" || currencyCode === "dollar" || currencyCode === "dolares"
    ? "$"
    : "₡";

  return `${prefix}${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function AssistantMessageBubble({ message }: { message: AssistantMessage }) {
  const t = useTheme();
  const isUser = message.sender === "user";

  if (!isUser) {
    return (
      <View
        style={{
          maxWidth: "96%",
          alignSelf: "flex-start",
          paddingVertical: t.spacing.xs,
        }}
      >
        <Text variant="body">{message.text}</Text>
        <MessageUtilities text={message.text} />
      </View>
    );
  }

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
      <MessageUtilities text={message.text} align="right" />
    </View>
  );
}

function OfferAssistantEmptyState() {
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
          width: 54,
          height: 54,
          borderRadius: 999,
          backgroundColor: t.colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="sparkles" size={28} color={t.colors.primary} />
      </View>
      <Text variant="body" align="center">
        Describe tu oferta y adjunta fotos reales
      </Text>
    </View>
  );
}

function hasSummaryValue(value: string | number | null | undefined) {
  return value !== null && value !== undefined && value !== "";
}

function OfferSummaryCard({
  summary,
  purchaseRequestTitle,
  offerPhotoCount,
  missingFields,
  hasOfferPhoto,
  disabled,
  loading,
  onContinue,
  onPublish,
}: {
  summary: SellerOfferAssistantSummary | null;
  purchaseRequestTitle: string | null | undefined;
  offerPhotoCount: number;
  missingFields: string[];
  hasOfferPhoto: boolean;
  disabled: boolean;
  loading: boolean;
  onContinue: () => void;
  onPublish: () => void;
}) {
  const formattedPrice = formatSummaryMoney(summary?.precio, summary?.moneda);
  const formattedShippingPrice = formatSummaryMoney(
    summary?.precioEnvio,
    summary?.moneda
  );
  const deliveryText = summary?.entrega ?? null;
  const pickupText = summary?.retiro ?? null;
  const pickupTimingText = summary?.retiroDespuesDeDias != null
    ? `${summary.retiroDespuesDeDias} día(s)`
    : null;
  const shippingTimingText = summary?.envioMaximoDias != null
    ? `${summary.envioMaximoDias} día(s)`
    : null;
  const details = [
    { label: "Precio", value: formattedPrice },
    { label: "Entrega", value: deliveryText },
    { label: "Tiempo máximo de entrega", value: shippingTimingText },
    { label: "Costo de envío", value: formattedShippingPrice },
    { label: "Retiro", value: pickupText },
    { label: "Retiro disponible en", value: pickupTimingText },
    {
      label: "Fotos",
      value:
        offerPhotoCount > 0
          ? `${offerPhotoCount} ${offerPhotoCount === 1 ? "foto adjunta" : "fotos adjuntas"}`
          : null,
    },
  ].filter((item) => hasSummaryValue(item.value));
  const notices: AssistantReviewNotice[] = [];

  if (missingFields.length > 0) {
    notices.push({ text: `Falta completar: ${missingFields.join(", ")}` });
  }

  if (!hasOfferPhoto) {
    notices.push({
      text: "Adjunta al menos una foto real de la oferta antes de enviarla.",
      tone: "error",
    });
  }

  return (
    <AssistantReviewCard
      completionTitle="Oferta lista"
      completionDescription="Revisa precio, entrega y fotos antes de enviarla."
      title={purchaseRequestTitle?.trim() || "Oferta"}
      description={summary?.descripcion ?? "Sin descripción todavía"}
      rows={details.map((item) => ({
        label: item.label,
        value: String(item.value),
      }))}
      notices={notices}
      primaryLabel="Enviar oferta"
      primaryDisabled={disabled || !hasOfferPhoto}
      primaryLoading={loading}
      onPrimaryPress={onPublish}
      secondaryLabel="Seguir ajustando"
      secondaryDisabled={disabled}
      onSecondaryPress={onContinue}
    />
  );
}

function OfferAssistantScreen({
  conversationId,
  purchaseRequestTitle,
}: {
  conversationId: string | null | undefined;
  purchaseRequestTitle: string | null | undefined;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [offerDraftId, setOfferDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isReadyToSend, setIsReadyToSend] = useState(false);
  const [summary, setSummary] = useState<SellerOfferAssistantSummary | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [successfulOfferPhotoCount, setSuccessfulOfferPhotoCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [processingMode, setProcessingMode] = useState<
    "thinking" | "summary" | null
  >(null);
  const [pendingRetry, setPendingRetry] = useState<PendingAssistantRetry | null>(null);
  const [allowExit, setAllowExit] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const shownSuccessOfferIdRef = useRef<string | null>(null);

  const hasOfferPhoto = successfulOfferPhotoCount > 0;

  useEffect(() => {
    if (showSummary) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [showSummary]);

  useEffect(() => {
    return () => {
      const activeRequest = activeRequestRef.current;
      activeRequestRef.current = null;
      activeRequest?.abort();
    };
  }, []);

  const handleStop = useCallback(() => {
    const activeRequest = activeRequestRef.current;
    if (!activeRequest) return;

    activeRequestRef.current = null;
    activeRequest.abort();
    setIsBusy(false);
    setProcessingMode(null);
    AccessibilityInfo.announceForAccessibility("Respuesta detenida");
  }, []);

  const clearReviewState = useCallback(() => {
    setShowSummary(false);
    setIsReadyToSend(false);
    setSummary(null);
    setMissingFields([]);
    setPendingRetry(null);
    setMessages((current) =>
      current.filter((message) => message.uiKind !== "ready" && message.uiKind !== "summary")
    );
  }, []);

  const appendAssistantMessage = useCallback(
    (text: string | null, uiKind?: AssistantMessage["uiKind"]) => {
      if (!text) return;
      setMessages((current) => [
        ...current,
        {
          id: createLocalId("assistant"),
          sender: "assistant",
          text,
          uiKind,
        },
      ]);
    },
    []
  );

  const applyAssistantResult = useCallback(
    (
      result: SellerOfferAssistantResult,
      input: SellerOfferAssistantRequest,
      successfulImageCount: number
    ) => {
      if (!result.ok) {
        if (result.error.code === "PROFILE_SCOPED_REQUEST_ABORTED") return;
        setPendingRetry({ input, successfulImageCount });
        const retryText = result.retryAfterSeconds
          ? ` Puedes intentarlo de nuevo en ${result.retryAfterSeconds} segundo(s).`
          : "";
        showError("No se pudo procesar la oferta", `${result.error.message}${retryText}`);
        return;
      }

      setPendingRetry(null);
      if (input.uiAction === "RESTORE") {
        setMessages(
          result.messages.map((message) => ({
            id: message.id,
            sender: message.role === "user" ? "user" : "assistant",
            text: message.content,
            images: message.imageUrls.map((uri) => ({ uri })),
          }))
        );
        setSuccessfulOfferPhotoCount(
          result.messages.reduce(
            (count, message) => count + message.imageUrls.length,
            0
          )
        );
      }
      if (result.offerDraftId) setOfferDraftId(result.offerDraftId);
      if (result.status) setStatus(result.status);
      const isContinueAction = input.uiAction === "CONTINUE";
      const isSummaryAction = input.uiAction === "SHOW_SUMMARY";
      const isReadyResult =
        result.isReadyToSend || result.status === "ready" || result.status === "sent";
      setIsReadyToSend(isContinueAction ? false : isReadyResult);
      setMissingFields(isContinueAction ? [] : result.missingFields);
      if (isContinueAction) {
        setSummary(null);
      } else if (result.summary) {
        setSummary(result.summary);
      }
      if (successfulImageCount > 0) {
        setSuccessfulOfferPhotoCount((current) => current + successfulImageCount);
      }

      if (!isSummaryAction) {
        appendAssistantMessage(
          result.assistantMessage,
          isReadyResult && !isContinueAction ? "ready" : undefined
        );
      } else {
        setShowSummary(true);
      }

      if (result.status === "sent") {
        if (result.purchaseOfferId) {
          if (!conversationId) {
            showWarning(
              "Oferta enviada",
              "No encontramos la conversación para abrir el detalle."
            );
            return;
          }
          if (shownSuccessOfferIdRef.current === result.purchaseOfferId) return;
          shownSuccessOfferIdRef.current = result.purchaseOfferId;

          const publishedConversationId = conversationId;
          openPopup({
            type: "success",
            title: "¡Oferta enviada!",
            description:
              "El comprador ya puede revisarla. Puedes seguir su estado en la conversación.",
            actionLabel: "Ver conversación",
            actionBackgroundColorKey: "textDark",
            onAction: () => {
              router.replace({
                pathname: "/(conversation)/offer",
                params: {
                  conversationId: publishedConversationId,
                  title: purchaseRequestTitle ?? "Conversación",
                },
              });
            },
          });
          return;
        }

        showError(
          "No se pudo confirmar la oferta",
          "El asistente respondió como enviada, pero no devolvió la oferta final."
        );
      }
    },
    [appendAssistantMessage, conversationId, purchaseRequestTitle]
  );

  const executeAssistantRequest = useCallback(
    async (input: SellerOfferAssistantRequest, successfulImageCount = 0) => {
      const requestController = new AbortController();
      activeRequestRef.current = requestController;
      setIsBusy(true);
      setProcessingMode(
        input.uiAction === "SHOW_SUMMARY"
          ? "summary"
          : input.uiAction
            ? null
            : "thinking"
      );
      try {
        const result = await callSellerOfferAssistant({
          ...input,
          signal: requestController.signal,
        });
        if (
          requestController.signal.aborted ||
          activeRequestRef.current !== requestController
        ) {
          return;
        }
        applyAssistantResult(result, input, successfulImageCount);
      } finally {
        if (activeRequestRef.current === requestController) {
          activeRequestRef.current = null;
          setIsBusy(false);
          setProcessingMode(null);
        }
      }
    },
    [applyAssistantResult]
  );

  useEffect(() => {
    if (!conversationId) return;
    void executeAssistantRequest({
      prompt: "",
      conversationId,
      uiAction: "RESTORE",
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-restore"),
    });
  }, [conversationId, executeAssistantRequest]);

  const handleSend = useCallback(
    async ({ text, images }: { text: string; images: ChatImage[] }) => {
      if (!conversationId) {
        showError("No se pudo crear la oferta", "No encontramos la conversación asociada.");
        return;
      }

      const userText = text.trim();
      if (!userText && images.length === 0) return;

      const shouldOpenSummary =
        images.length === 0 &&
        !!offerDraftId &&
        isReadyToSend &&
        shouldOpenSummaryFromReply(userText);

      if (!shouldOpenSummary) {
        clearReviewState();
      }
      setMessages((current) => [
        ...current,
        {
          id: createLocalId("user"),
          sender: "user",
          text: userText,
          images,
        },
      ]);

      if (shouldOpenSummary) {
        await executeAssistantRequest({
          prompt: "",
          offerDraftId,
          uiAction: "SHOW_SUMMARY",
          identity: createSellerOfferAssistantRequestIdentity("seller-offer-summary"),
        });
        return;
      }

      const input: SellerOfferAssistantRequest = {
        prompt: userText || "Adjunto fotos reales de la oferta.",
        conversationId: offerDraftId ? null : conversationId,
        offerDraftId,
        uiAction: null,
        images,
        identity: createSellerOfferAssistantRequestIdentity("seller-offer-message"),
      };

      await executeAssistantRequest(input, images.length);
    },
    [
      clearReviewState,
      conversationId,
      executeAssistantRequest,
      isReadyToSend,
      offerDraftId,
    ]
  );

  const handleContinue = useCallback(async () => {
    clearReviewState();
    if (!offerDraftId) return;

    await executeAssistantRequest({
      prompt: "",
      offerDraftId,
      uiAction: "CONTINUE",
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-continue"),
    });
  }, [clearReviewState, executeAssistantRequest, offerDraftId]);

  const handlePublish = useCallback(async () => {
    if (!offerDraftId) {
      showWarning("No se pudo enviar", "Primero crea el borrador de la oferta.");
      return;
    }

    if (!hasOfferPhoto) {
      showWarning("Falta una foto", "Adjunta al menos una foto real de la oferta antes de enviarla.");
      return;
    }

    await executeAssistantRequest({
      prompt: "",
      offerDraftId,
      uiAction: "PUBLISH",
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-publish"),
    });
  }, [executeAssistantRequest, hasOfferPhoto, offerDraftId]);

  const handleRetry = useCallback(async () => {
    if (!pendingRetry) return;
    await executeAssistantRequest(pendingRetry.input, pendingRetry.successfulImageCount);
  }, [executeAssistantRequest, pendingRetry]);

  usePreventRemove(
    Boolean(offerDraftId) && status !== "sent" && !allowExit,
    ({ data }) => {
      if (!offerDraftId) return;

      const closeAfterConfirmation = () => {
        setAllowExit(true);
        setTimeout(() => navigation.dispatch(data.action), 0);
      };

      const discardDraft = async () => {
        const result = await callSellerOfferAssistant({
          prompt: "",
          offerDraftId,
          uiAction: "DISCARD",
          identity: createSellerOfferAssistantRequestIdentity("seller-offer-discard"),
        });
        if (!result.ok) {
          showError("No se pudo descartar", result.error.message);
          return false;
        }

        closeAfterConfirmation();
        return true;
      };

      Keyboard.dismiss();
      openPopup({
        type: "summary",
        title: "¿Salir de la oferta?",
        description:
          "Puedes salir y continuar después, o descartar este borrador.",
        dismissOnBackdropPress: false,
        actions: [
          {
            id: "exit-offer",
            label: "Salir",
            backgroundColorKey: "backgroudWhite",
            textColorKey: "textDark",
            iconColorKey: "textDark",
            onPress: closeAfterConfirmation,
          },
          {
            id: "discard-draft",
            label: "Descartar",
            backgroundColorKey: "error",
            textColorKey: "backgroudWhite",
            iconColorKey: "backgroudWhite",
            disabled: isBusy,
            showPendingState: true,
            onPress: discardDraft,
          },
        ],
      });
    }
  );

  if (!conversationId) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: t.spacing.lg,
          gap: t.spacing.md,
        }}
      >
        <Text align="center" color="stateAnulated">
          No encontramos la conversación asociada.
        </Text>
        <Button title="Volver" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (showSummary) {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
          } else {
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
        contentContainerStyle={{
          paddingTop: insets.top + MODAL_TOP_BAR_HEIGHT + t.spacing.lg,
          paddingBottom: t.spacing.lg,
          gap: t.spacing.md,
          flexGrow: 1,
        }}
      >
        {messages.length === 0 && !isBusy ? <OfferAssistantEmptyState /> : null}

        {showSummary ? (
          <Text variant="body">
            Listo. Revisa que todo esté correcto antes de enviar tu oferta.
          </Text>
        ) : (
          messages.map((message) => (
            <AssistantMessageBubble key={message.id} message={message} />
          ))
        )}

        {isBusy ? (
          <AssistantProcessingProgress
            title="Preparando tu oferta"
            steps={OFFER_PROCESSING_STEPS}
            variant={processingMode === "summary" ? "steps" : "thinking"}
            onStop={processingMode ? handleStop : undefined}
          />
        ) : null}

        {pendingRetry ? (
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={handleRetry}
            style={{
              alignSelf: "flex-start",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: t.colors.border,
              backgroundColor: t.colors.backgroudWhite,
              paddingHorizontal: t.spacing.md,
              paddingVertical: t.spacing.sm,
              opacity: isBusy ? 0.6 : 1,
            }}
          >
            <Text variant="body">Reintentar último mensaje</Text>
          </Pressable>
        ) : null}

        {showSummary ? (
          <OfferSummaryCard
            summary={summary}
            purchaseRequestTitle={purchaseRequestTitle}
            offerPhotoCount={successfulOfferPhotoCount}
            missingFields={missingFields}
            hasOfferPhoto={hasOfferPhoto}
            disabled={isBusy || !isReadyToSend}
            loading={isBusy}
            onContinue={handleContinue}
            onPublish={handlePublish}
          />
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingTop: t.spacing.sm,
          paddingBottom:
            Platform.OS === "ios"
              ? Math.max(insets.bottom + t.spacing.sm, t.spacing.lg)
              : t.spacing.sm,
        }}
      >
        <InputChat
          clearOnSendStart
          autoFocus={messages.length === 0}
          disabled={isBusy}
          maxChars={4000}
          maxImages={6}
          placeholder={
            showSummary
              ? "Escribe un cambio"
              : "Describe tu oferta o adjunta fotos reales"
          }
          onSend={(payload) => {
            void handleSend(payload);
          }}
        />
      </View>
    </View>
  );
}

export default function OfferScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{
    purchaseRequest?: string | string[];
    purchaseRequestId?: string | string[];
    conversationId?: string | string[];
    mode?: string | string[];
  }>();
  const initialPurchaseRequest = parsePurchaseRequestParam(params.purchaseRequest);
  const purchaseRequestId = Array.isArray(params.purchaseRequestId)
    ? params.purchaseRequestId[0]
    : params.purchaseRequestId;
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const isEditMode = mode === "edit";
  const [purchaseRequest, setPurchaseRequest] = useState<OfferPurchaseRequest | null>(
    initialPurchaseRequest ?? buildFallbackPurchaseRequest(purchaseRequestId)
  );
  const [requestLoading, setRequestLoading] = useState(
    !initialPurchaseRequest && !!purchaseRequestId
  );
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [deliveryCatalog, setDeliveryCatalog] = useState<DeliveryCatalog[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>([]);
  const [pickupDelay, setPickupDelay] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [shippingMaxTime, setShippingMaxTime] = useState("");
  const [editDraft, setEditDraft] = useState<EditablePurchaseOfferDraft | null>(null);
  const [editDraftLoading, setEditDraftLoading] = useState(isEditMode);
  const [didApplyEditDraft, setDidApplyEditDraft] = useState(false);
  const resolvedPurchaseRequestId = purchaseRequestId ?? editDraft?.purchaseRequestId ?? null;
  const pickupCatalog = useMemo(
    () => deliveryCatalog.find((item) => item.method_kind === "pickup") ?? null,
    [deliveryCatalog]
  );
  const shippingCatalog = useMemo(
    () => deliveryCatalog.find((item) => item.method_kind === "shipping") ?? null,
    [deliveryCatalog]
  );
  const currencyToggleOptions = useMemo(() => {
    return currencies.slice(0, 2).map((currency) => ({
      label: currency.display_name ?? "-",
      value: currency.id,
    }));
  }, [currencies]);
  const canSubmitOffer =
    description.trim().length > 0 &&
    price.trim().length > 0 &&
    files.length > 0 &&
    deliveryMethods.length > 0 &&
    currencyId.length > 0;

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    const [currencyResult, deliveryResult] = await Promise.all([
      getCurrencies(),
      getDeliveryCatalog(),
    ]);

    if (currencyResult.ok) setCurrencies(currencyResult.data);
    else setCurrencies([]);

    if (deliveryResult.ok) setDeliveryCatalog(deliveryResult.data);
    else setDeliveryCatalog([]);

    setCatalogLoading(false);
  }, []);

  useEffect(() => {
    if (initialPurchaseRequest) {
      setPurchaseRequest(initialPurchaseRequest);
      setRequestLoading(false);
      return;
    }

    if (!resolvedPurchaseRequestId) {
      setRequestLoading(false);
      return;
    }

    setPurchaseRequest((current) =>
      current?.id === resolvedPurchaseRequestId
        ? current
        : buildFallbackPurchaseRequest(resolvedPurchaseRequestId)
    );

    let active = true;

    const loadPurchaseRequest = async () => {
      setRequestLoading(true);
      const result = await getPurchaseRequestById(resolvedPurchaseRequestId);
      if (!active) return;

      if (result?.ok) {
        setPurchaseRequest(result.data);
      }

      setRequestLoading(false);
    };

    void loadPurchaseRequest();

    return () => {
      active = false;
    };
  }, [initialPurchaseRequest, resolvedPurchaseRequestId]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalogs();
    }, [loadCatalogs])
  );

  useEffect(() => {
    if (!isEditMode || !conversationId) {
      setEditDraftLoading(false);
      return;
    }

    let active = true;

    const loadEditDraft = async () => {
      setEditDraftLoading(true);
      const result = await getEditablePurchaseOfferDraftByConversationId(conversationId);
      if (!active) return;

      if (result?.ok) {
        setEditDraft(result.data);
      } else if (result?.ok === false) {
        showError("No se pudo cargar la oferta", result.error.message);
      } else {
        showError("No se pudo cargar la oferta", "No encontramos una oferta para editar.");
      }

      setEditDraftLoading(false);
    };

    void loadEditDraft();

    return () => {
      active = false;
    };
  }, [conversationId, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !editDraft || didApplyEditDraft) return;
    if (deliveryCatalog.length === 0) return;

    const nextDeliveryMethodIds = [
      editDraft.deliveryCatalogId,
      editDraft.pickupCatalogId,
    ].filter(
      (id): id is string =>
        typeof id === "string" && deliveryCatalog.some((item) => item.id === id)
    );

    setDescription(editDraft.description);
    setPrice(
      Number.isFinite(editDraft.price) && editDraft.price > 0
        ? String(Math.trunc(editDraft.price))
        : ""
    );
    setCurrencyId(editDraft.currencyId);
    setFiles(editDraft.files as SelectedFile[]);
    setDeliveryMethods(nextDeliveryMethodIds);
    setPickupDelay(
      editDraft.pickupAfterDays == null ? "" : String(editDraft.pickupAfterDays)
    );
    setShippingCost(
      editDraft.shippingPrice == null ? "" : String(Math.trunc(editDraft.shippingPrice))
    );
    setShippingMaxTime(
      editDraft.shippingMaxDays == null ? "" : String(editDraft.shippingMaxDays)
    );
    setDidApplyEditDraft(true);
  }, [
    deliveryCatalog,
    didApplyEditDraft,
    editDraft,
    isEditMode,
  ]);

  useEffect(() => {
    const firstCurrencyId = currencyToggleOptions[0]?.value ?? "";
    if (firstCurrencyId.length === 0) return;

    if (!currencyId || !currencyToggleOptions.some((option) => option.value === currencyId)) {
      setCurrencyId(firstCurrencyId);
    }
  }, [currencyId, currencyToggleOptions]);

  const handlePriceChange = (text: string) => {
    setPrice(text.replace(/\D/g, ""));
  };

  const handleDeliveryMethodsChange = useCallback((selectedIds: string[]) => {
    setDeliveryMethods(selectedIds);
  }, []);

  const selectedCurrency = currencies.find((currency) => currency.id === currencyId) ?? null;
  const isColonCurrency = normalize(selectedCurrency?.currency_code) === "col";
  const priceLabel = isColonCurrency ? `₡${price}` : `$${price}`;
  const deliverySummary = deliveryMethods
    .map((method) => {
      const catalog = deliveryCatalog.find((item) => item.id === method);
      const displayName = catalog?.display_name ?? "Entrega";
      if (pickupCatalog && method === pickupCatalog.id) {
        if (!pickupDelay) return displayName;
        return `${displayName}: después de ${pickupDelay} día(s).`;
      }
      if (shippingCatalog && method === shippingCatalog.id) {
        const costText = shippingCost
          ? `${isColonCurrency ? "₡" : "$"}${shippingCost}`
          : "Sin costo definido";
        const timeText = shippingMaxTime
          ? `${shippingMaxTime} día(s)`
          : "sin tiempo definido";
        return `${displayName}: ${costText}, tiempo máximo ${timeText}.`;
      }
      return displayName;
    })
    .join(" ");

  const handleConfirmOffer = useCallback(async () => {
    const isPickupSelected = Boolean(
      pickupCatalog && deliveryMethods.includes(pickupCatalog.id)
    );
    const isShippingSelected = Boolean(
      shippingCatalog && deliveryMethods.includes(shippingCatalog.id)
    );
    const pickupAfterDays =
      isPickupSelected && pickupDelay ? Number(pickupDelay) : null;
    const shippingCostValue =
      isShippingSelected && shippingCost ? Number(shippingCost) : null;
    const shippingMaxDays =
      isShippingSelected && shippingMaxTime ? Number(shippingMaxTime) : null;

    if (isEditMode) {
      if (!conversationId || !editDraft?.purchaseOfferId || !editDraft.purchaseRequestId) {
        showError("No se pudo guardar", "No encontramos la conversación de esta oferta.");
        return;
      }

      const payload: UpdatePurchaseOfferInput = {
        purchaseRequestId: editDraft.purchaseRequestId,
        purchaseOfferId: editDraft.purchaseOfferId,
        conversationId,
        description,
        price: Number(price),
        currencyId,
        deliveryCatalogId: isShippingSelected ? shippingCatalog?.id ?? null : null,
        pickupCatalogId: isPickupSelected ? pickupCatalog?.id ?? null : null,
        files,
        pickupAfterDays,
        shippingCost: shippingCostValue,
        shippingMaxDays,
      };

      const result = await updatePurchaseOffer(payload);
      if (!result.ok) {
        showError("No se pudo guardar la oferta", result.error.message);
        return;
      }

      showSuccess("Oferta actualizada");
      router.replace({
        pathname: "/(conversation)/offer",
        params: {
          conversationId,
          title: purchaseRequest?.title ?? "Conversación",
        },
      });
      return;
    }

    showInfo("Creación desde el asistente", "La creación de ofertas ahora se hace con el asistente.");
  }, [
    conversationId,
    currencyId,
    deliveryMethods,
    description,
    editDraft?.purchaseOfferId,
    editDraft?.purchaseRequestId,
    files,
    isEditMode,
    pickupDelay,
    pickupCatalog,
    price,
    purchaseRequest,
    shippingCatalog,
    shippingCost,
    shippingMaxTime,
  ]);

  if (requestLoading || editDraftLoading) {
    return (
      <LoadingState
        label={isEditMode ? "Cargando oferta..." : "Cargando solicitud..."}
      />
    );
  }

  if (!purchaseRequest) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: t.spacing.lg,
          gap: t.spacing.md,
        }}
      >
        <Text align="center" color="stateAnulated">
          No encontramos la solicitud asociada.
        </Text>
        <Button title="Volver" onPress={() => router.back()} />
      </View>
    );
  }

  if (!isEditMode) {
    return (
      <OfferAssistantScreen
        conversationId={conversationId}
        purchaseRequestTitle={purchaseRequest?.title}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: t.spacing.md,
            paddingBottom: t.spacing.xl,
            gap: t.spacing.md,
            flexGrow: 1,
          }}
        >
        <ExpandableInfoCard
          title="Validado por Luppit"
          description="Luppit validará constantemente la información de la oferta, para asegurarnos de que ofreces el producto exacto de la solicitud."
          backgroundColorKey="primary"
          textColorKey="backgroudWhite"
          initiallyExpanded
        />

        <TextArea
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe el producto para que el comprador sepa exactamente qué recibirá. Ejemplo: Compresor original, usado, en buen estado con 3 meses de garantía."
        />

        {currencyToggleOptions.length >= 2 ? (
          <TextFieldWithToggle<string>
            label="Precio"
            value={price}
            onChangeText={handlePriceChange}
            options={
              currencyToggleOptions as [
                { label: string; value: string },
                { label: string; value: string },
              ]
            }
            selectedOption={currencyId || currencyToggleOptions[0]?.value || ""}
            onOptionChange={setCurrencyId}
            keyboardType="number-pad"
            inputMode="numeric"
          />
        ) : (
          catalogLoading ? (
            <LoadingState label="Cargando monedas..." variant="inline" />
          ) : (
            <Text color="stateAnulated">No hay monedas disponibles.</Text>
          )
        )}

        <FilePicker
          label="Imágenes"
          mode="images"
          accept={["image/*"]}
          maxFiles={10}
          value={files}
          onChange={setFiles}
        />

        {deliveryCatalog.length > 0 ? (
          <OptionsChecklistCard
            icon="truck"
            title="Método de entrega"
            description="Selecciona una o ambas opciones para esta oferta."
            allowMultiple
            value={deliveryMethods}
            onChange={handleDeliveryMethodsChange}
            options={deliveryCatalog.map((delivery) => ({
              id: delivery.id,
              label: delivery.display_name ?? "-",
              hint: delivery.hint ?? undefined,
              content:
                pickupCatalog && delivery.id === pickupCatalog.id ? (
                  <View style={{ gap: t.spacing.xs }}>
                    <TextField
                      label="Disponible después de (días)"
                      value={pickupDelay}
                      onChangeText={(text) =>
                        setPickupDelay(text.replace(/\D/g, ""))
                      }
                      keyboardType="number-pad"
                      inputMode="numeric"
                      baseContainerStyle={{ marginBottom: 0 }}
                    />
                  </View>
                ) : shippingCatalog && delivery.id === shippingCatalog.id ? (
                  <View style={{ gap: t.spacing.xs }}>
                    <View style={{ gap: t.spacing.xs }}>
                      <Text color="stateAnulated">Costo</Text>
                      <TextFieldWithToggle<string>
                        value={shippingCost}
                        onChangeText={(text) =>
                          setShippingCost(text.replace(/\D/g, ""))
                        }
                        options={
                          currencyToggleOptions as [
                            { label: string; value: string },
                            { label: string; value: string },
                          ]
                        }
                        selectedOption={currencyId || currencyToggleOptions[0]?.value || ""}
                        onOptionChange={setCurrencyId}
                        keyboardType="number-pad"
                        inputMode="numeric"
                      />
                    </View>

                    <View style={{ gap: t.spacing.xs }}>
                      <TextField
                        label="Tiempo máximo de entrega (días)"
                        value={shippingMaxTime}
                        onChangeText={(text) =>
                          setShippingMaxTime(text.replace(/\D/g, ""))
                        }
                        keyboardType="number-pad"
                        inputMode="numeric"
                        baseContainerStyle={{ marginBottom: 0 }}
                      />
                    </View>
                  </View>
                ) : undefined,
            }))}
          />
        ) : (
          catalogLoading ? (
            <LoadingState label="Cargando métodos de entrega..." variant="inline" />
          ) : (
            <Text color="stateAnulated">
              No hay métodos de entrega disponibles.
            </Text>
          )
        )}

        {canSubmitOffer ? (
          <Button
            variant="dark"
            title={isEditMode ? "Guardar cambios" : "Enviar oferta"}
            onPress={() =>
              openPopup({
                type: "summary",
                title: isEditMode
                  ? "Revisa la oferta antes de guardar"
                  : "Revisa la oferta antes de publicarla",
                icon: "file-text",
                description:
                  isEditMode
                    ? "Revisa la información antes de guardar los cambios."
                    : "Revisa la información antes de publicarla. Asegúrate de que la descripción y los detalles de la oferta sean correctos.",
                rows: [
                  { label: "Descripción", value: description },
                  { label: "Precio", value: priceLabel },
                  { label: "Método de entrega", value: deliverySummary },
                ],
                images: files.map((file) => ({ uri: file.uri })),
                actions: [
                  {
                    id: "edit",
                    label: "Seguir editando",
                    icon: "sliders-horizontal",
                    backgroundColorKey: "backgroudWhite",
                    textColorKey: "textDark",
                    iconColorKey: "textDark",
                  },
                  {
                    id: "publish",
                    label: isEditMode ? "Guardar cambios" : "Publicar oferta",
                    icon: "check",
                    backgroundColorKey: "primary",
                    textColorKey: "backgroudWhite",
                    iconColorKey: "backgroudWhite",
                    onPress: handleConfirmOffer,
                  },
                ],
              })
            }
          />
        ) : null}
        </ScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
