import { getCurrentProfile, subscribeActiveProfile } from "@/src/services/active.profile.service";
import { getOrCreateCurrentSellerOfferSeedConversation } from "@/src/services/seller.request.offers.service";
import { useAndroidLeaveGuard } from "@/src/utils/useAndroidLeaveGuard";
import {
  getVisibleSellerOfferMessages,
  isSellerOfferReviewInstruction,
  isSellerOfferSummaryInvitation,
  isSellerOfferSummaryReply,
} from "../../src/utils/assistantSummaryReply";
import Button from "@/src/components/button/Button";
import AssistantProcessingProgress from "@/src/components/assistant/AssistantProcessingProgress";
import OfferRequestReference from "@/src/components/assistant/OfferRequestReference";
import {
  getOfferRequestReference,
  type OfferRequestReference as RequestReference,
} from "@/src/services/purchase.offer.reference.service";
import AssistantReviewCard, {
  type AssistantReviewNotice,
} from "@/src/components/assistant/AssistantReviewCard";
import InputChat, { type ChatImage } from "@/src/components/inputChat/inputChat";
import { useAndroidChatKeyboardVisible } from "@/src/components/inputChat/ChatKeyboardAvoidingView";
import MessageUtilities from "@/src/components/message/MessageUtilities";
import {
  callSellerOfferAssistant,
  createSellerOfferAssistantRequestIdentity,
  SellerOfferAssistantRequest,
  SellerOfferAssistantResult,
  SellerOfferAssistantSummary,
  type SellerOfferBatchOption,
  type SellerOfferBatchPublication,
  type SellerOfferAssistantImage,
} from "@/src/services/purchase.offer.assistant.service";
import { closePopup, openPopup, subscribePopup, type PopupSummaryConfig } from "@/src/services/popup.service";
import ConversationContextControls from "@/src/components/conversation/ConversationContextControls";
import { Text } from "@/src/components/Text";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import LoadingState from "@/src/components/loading/LoadingState";
import { useTheme } from "@/src/themes";
import { showError, showWarning } from "@/src/utils/useToast";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AssistantMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  images?: ChatImage[];
};

type PendingAssistantRetry = {
  input: SellerOfferAssistantRequest;
  successfulImageCount: number;
};

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

function hasSummaryValue(value: string | number | null | undefined) {
  return value !== null && value !== undefined && value !== "";
}

function getOfferSummaryDetails(summary: SellerOfferAssistantSummary | null, offerPhotoCount: number) {
  const formattedPrice = formatSummaryMoney(summary?.precio, summary?.moneda);
  const formattedShippingPrice = formatSummaryMoney(
    summary?.precioEnvio,
    summary?.moneda
  );
  const deliveryOptionsText = [summary?.entrega, summary?.retiro]
    .filter((method) => typeof method === "string" && method.trim().length > 0)
    .join(" · ");
  const pickupTimingText = summary?.retiroDespuesDeDias != null
    ? `${summary.retiroDespuesDeDias} día(s)`
    : null;
  const shippingTimingText = summary?.envioMaximoDias != null
    ? `${summary.envioMaximoDias} día(s)`
    : null;
  return [
    {
      label: summary?.basePrecio === "UNIT" ? "Precio por unidad" : "Precio total",
      value: formattedPrice,
    },
    {
      label: "Cantidad ofrecida",
      value: summary?.cantidadOfrecida != null ? String(summary.cantidadOfrecida) : null,
    },
    {
      label: "Total de productos",
      value: summary?.basePrecio === "UNIT"
        ? formatSummaryMoney(summary?.precioTotal, summary?.moneda)
        : null,
    },
    { label: "Opciones de entrega", value: deliveryOptionsText },
    { label: "Tiempo máximo de entrega", value: shippingTimingText },
    { label: "Costo de envío", value: formattedShippingPrice },
    { label: "Retiro disponible en", value: pickupTimingText },
    {
      label: "Fotos",
      value:
        offerPhotoCount > 0
          ? `${offerPhotoCount} ${offerPhotoCount === 1 ? "foto adjunta" : "fotos adjuntas"}`
          : null,
    },
  ].filter((item) => hasSummaryValue(item.value));
}

function OfferEditContext({
  summary,
  images,
  hasChanges,
  reference,
  disabled = false,
}: {
  summary: SellerOfferAssistantSummary | null;
  images: SellerOfferAssistantImage[];
  hasChanges: boolean;
  reference: RequestReference;
  disabled?: boolean;
}) {
  const popup = useRef<PopupSummaryConfig | null>(null);
  const total = formatSummaryMoney(
    summary?.basePrecio === "UNIT" ? summary.precioTotal : summary?.precio,
    summary?.moneda
  );
  useEffect(() => subscribePopup(({ config }) => {
    if (config !== popup.current) popup.current = null;
  }), []);
  const closeContext = useCallback(() => {
    if (popup.current) {
      popup.current = null;
      closePopup();
    }
  }, []);
  useEffect(closeContext, [summary, images, hasChanges, reference, disabled, closeContext]);
  useFocusEffect(useCallback(() => closeContext, [closeContext]));

  const showContext = (kind: "offer" | "request") => {
    if (disabled || (kind === "offer" && !summary)) return;
    Keyboard.dismiss();
    const config: PopupSummaryConfig = {
      type: "summary",
      title: kind === "request" ? "Solicitud del comprador" : hasChanges ? "Cambios propuestos" : "Resumen de la oferta",
      ...(kind === "offer" ? {
        rows: getOfferSummaryDetails(summary, 0).map((detail) => ({
          label: detail.label,
          value: detail.value ?? "",
        })),
        description: summary?.descripcion || undefined,
        descriptionPlacement: "afterRows" as const,
        images: images.map((photo) => ({ uri: photo.url })),
      } : {
        description: reference.text ?? "Esta solicitud no tiene título ni resumen disponibles.",
      }),
      androidBackActionId: "offer-context-close",
      actions: [{
        id: "offer-context-close",
        label: "Cerrar",
        backgroundColorKey: "backgroudWhite",
        textColorKey: "textDark",
      }],
    };
    popup.current = config;
    openPopup(config);
  };

  return (
    <ConversationContextControls
      price={total}
      primary={{
        label: "Oferta",
        accessibilityLabel: hasChanges ? "Resumen de los cambios propuestos" : "Resumen de la oferta",
        onPress: () => showContext("offer"),
        disabled: disabled || !summary,
      }}
      secondary={{
        label: "Solicitud",
        accessibilityLabel: "Solicitud del comprador",
        onPress: () => showContext("request"),
        disabled,
      }}
    />
  );
}

function OfferPhotos({ images }: { images: SellerOfferAssistantImage[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm }}>
      {images.map((photo, index) => (
        <View key={photo.storageRef} style={{ gap: t.spacing.xs }}>
          <Image source={{ uri: photo.url }} accessibilityLabel={`Foto ${index + 1} de la oferta`}
            resizeMode="contain" style={{ width: 96, height: 96, borderRadius: t.borders.md }} />
        </View>
      ))}
    </View>
  );
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
  isEditMode = false,
  changedFields = [],
  offerImages = [],
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
  isEditMode?: boolean;
  changedFields?: string[];
  offerImages?: SellerOfferAssistantImage[];
}) {
  const t = useTheme();
  const details = getOfferSummaryDetails(summary, isEditMode ? 0 : offerPhotoCount);
  const notices: AssistantReviewNotice[] = [];
  const isComplete = hasOfferPhoto && missingFields.length === 0;
  if (isEditMode && changedFields.length) notices.push({ text: `Cambios: ${changedFields.join(", ")}.` });

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
      completionTitle={isComplete ? isEditMode ? "Propuesta lista" : "Oferta lista" : "Oferta incompleta"}
      completionDescription={isComplete
        ? isEditMode
          ? "El comprador deberá aprobar estos cambios. La oferta actual seguirá vigente hasta entonces."
          : "Revisa tu oferta. El comprador deberá elegir y aceptar uno de los métodos de entrega que ofreces."
        : "Completa los datos pendientes antes de enviar tu oferta."}
      isComplete={isComplete}
      title={purchaseRequestTitle?.trim() || "Oferta"}
      description={summary?.descripcion ?? "Sin descripción todavía"}
      rows={details.map((item) => ({
        label: item.label,
        value: String(item.value),
      }))}
      notices={notices}
      primaryLabel={isEditMode ? "Proponer cambios" : "Enviar oferta"}
      primaryDisabled={disabled || !isComplete}
      primaryLoading={loading}
      onPrimaryPress={onPublish}
      secondaryLabel="Seguir ajustando"
      secondaryDisabled={loading}
      onSecondaryPress={onContinue}
    >
      {isEditMode && offerImages.length > 0 ? (
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="small" color="textMedium">Fotos que verá el comprador</Text>
          <OfferPhotos images={offerImages} />
        </View>
      ) : null}
    </AssistantReviewCard>
  );
}

function OfferAssistantScreen({
  conversationId,
  purchaseRequestTitle,
  requestReference,
  mode = "create",
}: {
  conversationId: string | null | undefined;
  purchaseRequestTitle: string | null | undefined;
  requestReference: RequestReference;
  mode?: "create" | "edit";
}) {
  const t = useTheme();
  const isEditMode = mode === "edit";
  const insets = useSafeAreaInsets();
  const isAndroidKeyboardVisible = useAndroidChatKeyboardVisible();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const autoScrollPendingRef = useRef(true);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [offerDraftId, setOfferDraftId] = useState<string | null>(null);
  const currentDraftIdRef = useRef<string | null>(null);
  const pendingDiscardRef = useRef<SellerOfferAssistantRequest | null>(null);
  const restoreAfterDiscardRef = useRef(false);
  const [draftResetKey, setDraftResetKey] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [isReadyToSend, setIsReadyToSend] = useState(false);
  const [summary, setSummary] = useState<SellerOfferAssistantSummary | null>(null);
  const [contextSummary, setContextSummary] = useState<SellerOfferAssistantSummary | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [offerImages, setOfferImages] = useState<SellerOfferAssistantImage[]>([]);
  const [hasChanges, setHasChanges] = useState(!isEditMode);
  const [editContextHeight, setEditContextHeight] = useState(0);
  const [changedFields, setChangedFields] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const versionRef = useRef<number | null>(null);
  const offerRevisionRef = useRef<string | null>(null);
  const successfulOfferPhotoCount = offerImages.length;
  const [showSummary, setShowSummary] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [hasComposerDraft, setHasComposerDraft] = useState(false);
  useAndroidLeaveGuard(!offerDraftId && (hasComposerDraft || messages.length > 0 || isBusy));
  const [processingMode, setProcessingMode] = useState<
    "thinking" | "summary" | null
  >(null);
  const [pendingRetry, setPendingRetry] = useState<PendingAssistantRetry | null>(null);
  const [allowExit, setAllowExit] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const shownSuccessOfferIdRef = useRef<string | null>(null);

  const hasOfferPhoto = successfulOfferPhotoCount > 0;
  const visibleMessages = useMemo(() => getVisibleSellerOfferMessages(messages), [messages]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      currentDraftIdRef.current = null;
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
  }, []);

  const appendAssistantMessage = useCallback(
    (text: string | null) => {
      if (!text) return;
      setMessages((current) => [
        ...current,
        {
          id: createLocalId("assistant"),
          sender: "assistant",
          text,
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
        if (!restoreAfterDiscardRef.current && ["offer_edit_unavailable", "offer_draft_closed", "offer_edit_not_allowed", "offer_proposal_pending"].includes(result.error.code ?? "")) {
          setAllowExit(true);
          setStatus("cancelled");
          showWarning("La oferta ya no se puede modificar", result.error.message);
          router.replace({ pathname: "/(conversation)/offer", params: { conversationId, title: purchaseRequestTitle ?? "Conversación" } });
          return;
        }
        if (["offer_draft_changed", "offer_changed"].includes(result.error.code ?? "")) {
          clearReviewState();
          if (result.conflictDraftId) {
            currentDraftIdRef.current = result.conflictDraftId;
            setOfferDraftId(result.conflictDraftId);
          }
          if (result.conflictDraftVersion != null) versionRef.current = result.conflictDraftVersion;
          setConflict(result.error.code ?? null);
          setInitialized(false);
          setPendingRetry(null);
        } else setPendingRetry({ input, successfulImageCount });
        const retryText = result.retryAfterSeconds
          ? ` Puedes intentarlo de nuevo en ${result.retryAfterSeconds} segundo(s).`
          : "";
        showError("No se pudo procesar la oferta", `${result.error.message}${retryText}`);
        return;
      }

      autoScrollPendingRef.current = true;
      restoreAfterDiscardRef.current = false;
      setPendingRetry(null);
      setConflict(null);
      setInitialized(true);
      versionRef.current = result.draftVersion;
      offerRevisionRef.current = result.baseOfferRevision;
      setOfferImages(result.offerImages ?? []);
      if (result.summary) setContextSummary(result.summary);
      setHasChanges(result.hasChanges);
      setChangedFields(result.changedFields ?? []);
      if (input.uiAction === "RESTORE") {
        setMessages(
          result.messages.map((message) => ({
            id: message.id,
            sender: message.role === "user" ? "user" : "assistant",
            text: message.content,
            images: message.imageUrls.map((uri) => ({ uri })),
          }))
        );

      }
      if (result.offerDraftId) {
        currentDraftIdRef.current = result.offerDraftId;
        setOfferDraftId(result.offerDraftId);
      }
      if (result.status === "sent" || result.status === "cancelled") currentDraftIdRef.current = null;
      if (result.status) setStatus(result.status);
      const isContinueAction = input.uiAction === "CONTINUE";
      const isSummaryAction = input.uiAction === "SHOW_SUMMARY";
      const isReadyResult =
        result.isReadyToSend && result.missingFields.length === 0;
      setIsReadyToSend(isReadyResult);
      setMissingFields(result.missingFields);
      if (isContinueAction || !isReadyResult) {
        setShowSummary(false);
        setSummary(null);
      } else if (result.summary) {
        setSummary(result.summary);
      }


      if (
        input.uiAction !== "RESTORE" &&
        result.assistantMessage &&
        !isSellerOfferReviewInstruction(result.assistantMessage) &&
        !(isContinueAction && isSellerOfferSummaryInvitation(result.assistantMessage))
      ) {
        appendAssistantMessage(result.assistantMessage);
      }
      if (input.uiAction === "RESTORE") setShowSummary(result.uiState === "review" && isReadyResult);
      if (isSummaryAction) {
        setShowSummary(isReadyResult && result.summary !== null);
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
            title: isEditMode ? "¡Propuesta enviada!" : "¡Oferta enviada!",
            description: isEditMode
              ? "El comprador podrá aceptar o rechazar tus cambios. La oferta actual sigue vigente mientras decide."
              : "El comprador ya puede revisarla. Puedes seguir su estado en la conversación.",
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
    [appendAssistantMessage, clearReviewState, conversationId, purchaseRequestTitle, isEditMode]
  );

  const executeAssistantRequest = useCallback(
    async (input: SellerOfferAssistantRequest, successfulImageCount = 0) => {
      if (!mountedRef.current || activeRequestRef.current) return;
      const requestController = new AbortController();
      const requestInput: SellerOfferAssistantRequest = {
        ...input, mode,
        expectedDraftVersion: input.expectedDraftVersion ?? versionRef.current,
        expectedOfferRevision: input.expectedOfferRevision ?? offerRevisionRef.current,
      };
      activeRequestRef.current = requestController;
      autoScrollPendingRef.current = true;
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
          ...requestInput,
          signal: requestController.signal,
        });
        if (
          requestController.signal.aborted ||
          activeRequestRef.current !== requestController
        ) {
          return;
        }
        if (input.uiAction !== "DISCARD") {
          applyAssistantResult(result, requestInput, successfulImageCount);
        }
        return result;
      } catch {
        if (!requestController.signal.aborted && activeRequestRef.current === requestController) {
          if (input.uiAction !== "DISCARD") setPendingRetry({ input: requestInput, successfulImageCount });
          showError("No se pudo continuar", "Reintenta en un momento.");
        }
      } finally {
        if (activeRequestRef.current === requestController) {
          activeRequestRef.current = null;
          setIsBusy(false);
          setProcessingMode(null);
        }
      }
    },
    [applyAssistantResult, mode]
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

      if (!initialized) return;
      const userText = text.trim();
      if (
        (!userText && images.length === 0) ||
        activeRequestRef.current ||
        status === "sent" ||
        status === "cancelled"
      ) return;

      const shouldOpenSummary =
        images.length === 0 &&
        !!offerDraftId &&
        !showSummary &&
        status === "ready" &&
        isReadyToSend &&
        isSellerOfferSummaryReply(userText, visibleMessages[visibleMessages.length - 1]);

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
          prompt: userText,
          offerDraftId,
          uiAction: "SHOW_SUMMARY",
          identity: createSellerOfferAssistantRequestIdentity("seller-offer-summary"),
        });
        return;
      }

      const input: SellerOfferAssistantRequest = {
        prompt: userText,
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
      initialized,
      conversationId,
      executeAssistantRequest,
      isReadyToSend,
      offerDraftId,
      showSummary,
      status,
      visibleMessages,
    ]
  );

  const handleContinue = useCallback(async () => {
    if (!initialized || conflict || !offerDraftId || activeRequestRef.current || status === "sent") return;

    await executeAssistantRequest({
      prompt: "",
      offerDraftId,
      uiAction: "CONTINUE",
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-continue"),
    });
  }, [conflict, executeAssistantRequest, initialized, offerDraftId, status]);

  const handlePublish = useCallback(async () => {
    if (!initialized || conflict || !isReadyToSend || (isEditMode && !hasChanges)) return;
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
  }, [conflict, executeAssistantRequest, hasChanges, hasOfferPhoto, initialized, isEditMode, isReadyToSend, offerDraftId]);

  const handleRetry = useCallback(async () => {
    if (!pendingRetry) return;
    await executeAssistantRequest(pendingRetry.input, pendingRetry.successfulImageCount);
  }, [executeAssistantRequest, pendingRetry]);

  const discardDraft = useCallback(async () => {
    if (
      !offerDraftId || currentDraftIdRef.current !== offerDraftId ||
      activeRequestRef.current || status === "sent" || status === "cancelled"
    ) return false;
    const previous = pendingDiscardRef.current;
    const input: SellerOfferAssistantRequest = previous?.offerDraftId === offerDraftId &&
      previous.expectedDraftVersion === versionRef.current &&
      previous.expectedOfferRevision === offerRevisionRef.current ? previous : {
      prompt: "", mode, offerDraftId, uiAction: "DISCARD",
      expectedDraftVersion: versionRef.current,
      expectedOfferRevision: offerRevisionRef.current,
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-discard"),
    };
    pendingDiscardRef.current = input;
    const result = await executeAssistantRequest(input);
    if (!result) return false;
    if (
      !result.ok || result.status !== "cancelled" ||
      result.submittedProposalId || (!isEditMode && result.purchaseOfferId)
    ) {
      if (result.ok || result.error.code !== "PROFILE_SCOPED_REQUEST_ABORTED") {
        showError("No se pudo descartar", result.ok ? "No se confirmó el descarte. Reintenta en un momento." : result.error.message);
      }
      return false;
    }

    currentDraftIdRef.current = null;
    pendingDiscardRef.current = null;
    versionRef.current = null;
    offerRevisionRef.current = null;
    shownSuccessOfferIdRef.current = null;
    setOfferDraftId(null);
    setMessages([]);
    setStatus(null);
    clearReviewState();
    setContextSummary(null);
    setOfferImages([]);
    setHasChanges(!isEditMode);
    setChangedFields([]);
    setConflict(null);
    setInitialized(!isEditMode);
    setHasComposerDraft(false);
    setDraftResetKey((value) => value + 1);
    autoScrollPendingRef.current = true;
    if (isEditMode) {
      restoreAfterDiscardRef.current = true;
      await executeAssistantRequest({ prompt: "", conversationId, uiAction: "RESTORE",
        identity: createSellerOfferAssistantRequestIdentity("seller-offer-restore") });
    }
    return true;
  }, [clearReviewState, conversationId, executeAssistantRequest, isEditMode, mode, offerDraftId, status]);

  usePreventRemove(
    Boolean(offerDraftId) && status !== "sent" && status !== "cancelled" && !allowExit,
    ({ data }) => {
      if (!offerDraftId || (activeRequestRef.current && !processingMode)) return;

      const closeAfterConfirmation = () => {
        setAllowExit(true);
        setTimeout(() => navigation.dispatch(data.action), 0);
      };

      Keyboard.dismiss();
      openPopup({
        type: "summary",
        title: isEditMode ? "¿Salir de la modificación?" : "¿Salir de la oferta?",
        description: hasComposerDraft
          ? "Puedes continuar después con el borrador guardado. El texto o las fotos que todavía no hayas enviado se perderán."
          : "Tu borrador quedará guardado para continuar después.",
        dismissOnBackdropPress: true,
        actions: [
          {
            id: "exit-offer",
            label: "Salir",
            accessibilityLabel: "Salir y conservar borrador",
            backgroundColorKey: "backgroudWhite",
            textColorKey: "textDark",
            iconColorKey: "textDark",
            onPress: closeAfterConfirmation,
          },
          {
            id: "discard-draft",
            label: "Descartar",
            accessibilityLabel: "Descartar borrador",
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
      {isEditMode ? (
        <View
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setEditContextHeight((currentHeight) =>
              currentHeight === nextHeight ? currentHeight : nextHeight
            );
          }}
          style={{
            position: "absolute",
            top: insets.top + MODAL_TOP_BAR_HEIGHT + t.spacing.sm,
            left: 0,
            right: 0,
            zIndex: 9,
            backgroundColor: "transparent",
            paddingBottom: t.spacing.sm,
          }}
        >
          <OfferEditContext summary={contextSummary} images={offerImages}
            hasChanges={hasChanges} reference={requestReference}
            disabled={isBusy || !initialized || Boolean(conflict) || status === "sent" || status === "cancelled"} />
        </View>
      ) : null}
      <ScrollView
        ref={scrollRef}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!autoScrollPendingRef.current) return;
          autoScrollPendingRef.current = false;
          if (messages.length === 0) {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
          } else {
            scrollRef.current?.scrollToEnd({ animated: true });
          }
        }}
        contentContainerStyle={{
          paddingTop: isEditMode
            ? insets.top + MODAL_TOP_BAR_HEIGHT + t.spacing.sm +
              (editContextHeight || 48 + t.spacing.sm) + t.spacing.lg
            : insets.top + MODAL_TOP_BAR_HEIGHT + t.spacing.lg,
          paddingBottom: t.spacing.lg,
          gap: t.spacing.md,
          flexGrow: 1,
        }}
      >
        {isEditMode ? (
          initialized && visibleMessages.length === 0 && !showSummary ? (
            <View style={{ gap: t.spacing.md }}>
              <Text variant="title">¿Qué quieres cambiar?</Text>
              <Text color="textMedium">Cuéntame el cambio. Mantendré el resto de la oferta.</Text>
              <Text variant="small" color="textMedium">
                Solo tú ves este borrador. El comprador verá los cambios cuando los propongas y se aplicarán solo si los acepta.
              </Text>
            </View>
          ) : null
        ) : <OfferRequestReference reference={requestReference} />}

        {visibleMessages.map((message) => (
          <AssistantMessageBubble key={message.id} message={message} />
        ))}

        {isBusy ? (
          <AssistantProcessingProgress
            title="Preparando tu oferta"
            steps={[]}
            variant="thinking"
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

        {conflict ? <View style={{ gap: t.spacing.sm }}>
          <Text>{conflict === "offer_changed" ? "La oferta publicada cambió. Puedes descartar estos cambios y empezar con la oferta actual." : "El borrador cambió en otra sesión. Carga los últimos cambios para continuar."}</Text>
          <Button title={conflict === "offer_changed" ? "Descartar cambios y cargar oferta" : "Cargar últimos cambios"}
            disabled={isBusy} onPress={() => { void (async () => {
              if (conflict === "offer_changed" && offerDraftId) {
                await discardDraft();
                return;
              }
              await executeAssistantRequest({ prompt: "", conversationId, uiAction: "RESTORE",
                identity: createSellerOfferAssistantRequestIdentity("seller-offer-restore") });
            })(); }} />
        </View> : null}
        {showSummary ? (
          <OfferSummaryCard
            summary={summary}
            purchaseRequestTitle={purchaseRequestTitle}
            offerPhotoCount={successfulOfferPhotoCount}
            missingFields={missingFields}
            hasOfferPhoto={hasOfferPhoto}
            disabled={isBusy || !initialized || Boolean(conflict) || !isReadyToSend || (isEditMode && !hasChanges)}
            loading={isBusy}
            isEditMode={isEditMode}
            changedFields={changedFields}
            offerImages={offerImages}
            onContinue={handleContinue}
            onPublish={handlePublish}
          />
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingTop: t.spacing.sm,
          gap: t.spacing.md,
          paddingBottom:
            Platform.OS === "ios"
              ? Math.max(insets.bottom + t.spacing.sm, t.spacing.lg)
              : Platform.OS === "android" && !isAndroidKeyboardVisible
                ? Math.max(insets.bottom, t.spacing.sm)
                : t.spacing.sm,
        }}
      >
        <InputChat
          key={draftResetKey}
          onDraftChange={setHasComposerDraft}
          clearOnSendStart
          autoFocus={!isEditMode && messages.length === 0}
          disabled={isBusy || !initialized || status === "sent" || status === "cancelled"}
          busy={isBusy}
          onStop={processingMode ? handleStop : undefined}
          maxChars={4000}
          maxImages={6}
          placeholder={
            showSummary
              ? "Escribe un cambio"
              : isEditMode ? "¿Qué quieres cambiar?" : "Describe tu oferta o adjunta fotos reales"
          }
          onSend={(payload) => {
            void handleSend(payload);
          }}
        />
      </View>
    </View>
  );
}

function BatchOfferAssistantScreen({ conversationId, requestReference }: {
  conversationId: string;
  requestReference: RequestReference;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const isAndroidKeyboardVisible = useAndroidChatKeyboardVisible();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [options, setOptions] = useState<SellerOfferBatchOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [publications, setPublications] = useState<SellerOfferBatchPublication[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<SellerOfferAssistantRequest | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const versionRef = useRef<number | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const activeInputRef = useRef<SellerOfferAssistantRequest | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const run = useCallback(async (input: SellerOfferAssistantRequest) => {
    if (activeRequestRef.current) return;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    activeInputRef.current = input;
    setBusy(true);
    const request: SellerOfferAssistantRequest = {
      ...input, mode: "batch",
      conversationId: input.offerDraftId ? null : conversationId,
      expectedDraftVersion: input.expectedDraftVersion ?? versionRef.current,
      signal: controller.signal,
    };
    try {
      const result = await callSellerOfferAssistant(request);
      if (controller.signal.aborted) return;
      if (!result.ok) {
        setPendingRetry(input);
        showError("No se pudieron preparar las ofertas", result.error.message);
        return;
      }
      setPendingRetry(null);
      setInitialized(true);
      draftIdRef.current = result.offerDraftId;
      versionRef.current = result.draftVersion;
      setStatus(result.status);
      setOptions(result.options);
      setSelectedIds((current) => input.uiAction == null ? [] : current.filter((id) =>
        result.options.some((option) => option.id === id && option.isReadyToSend)));
      if (input.uiAction === "RESTORE") {
        setMessages(result.messages.map((message) => ({
          id: message.id, sender: message.role, text: message.content,
          images: message.imageUrls.map((uri) => ({ uri })),
        })));
      } else if (result.assistantMessage && input.uiAction !== "PUBLISH") {
        setMessages((current) => [...current, {
          id: createLocalId("assistant"), sender: "assistant",
          text: result.assistantMessage ?? "",
        }]);
      }
      if (result.status === "sent") setPublications(result.publications);
      if (result.status === "cancelled") router.back();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      if (!controller.signal.aborted) {
        setPendingRetry(input);
        showError("No se pudieron preparar las ofertas", "Reintenta en un momento.");
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        activeInputRef.current = null;
        setBusy(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    void run({ prompt: "", conversationId, uiAction: "RESTORE",
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-batch-restore") });
    return () => { activeRequestRef.current?.abort(); };
  }, [conversationId, run]);

  const handleSend = ({ text, images }: { text: string; images: ChatImage[] }) => {
    if (!initialized || status === "sent") return;
    const prompt = text.trim();
    if (!prompt && !images.length) return;
    setMessages((current) => [...current, {
      id: createLocalId("user"), sender: "user", text: prompt, images,
    }]);
    void run({ prompt, images, offerDraftId: draftIdRef.current,
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-batch-message") });
  };

  const publish = () => {
    if (!draftIdRef.current || !selectedIds.length || busy) return;
    void run({ prompt: "", offerDraftId: draftIdRef.current,
      uiAction: "PUBLISH", selectedOptionIds: selectedIds,
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-batch-publish") });
  };

  return <View style={{ flex: 1 }}>
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive" contentContainerStyle={{
        paddingTop: insets.top + MODAL_TOP_BAR_HEIGHT + t.spacing.lg,
        paddingBottom: t.spacing.lg, paddingHorizontal: t.spacing.md,
        gap: t.spacing.md, flexGrow: 1,
      }}>
      <OfferRequestReference reference={requestReference} />
      {messages.map((message) => <AssistantMessageBubble key={message.id} message={message} />)}
      {busy ? <AssistantProcessingProgress title="Preparando tus ofertas"
        steps={[]} variant="thinking" /> : null}
      {pendingRetry ? <Button title="Reintentar" disabled={busy}
        onPress={() => { void run(pendingRetry); }} /> : null}
      {status === "sent" ? <View style={{ gap: t.spacing.md }}>
        <Text variant="subtitle">Ofertas enviadas</Text>
        <Text color="textMedium">Cada oferta tiene su propia conversación con el comprador.</Text>
        {publications.map((publication) => {
          const option = options.find((item) => item.id === publication.optionId);
          return <Button key={publication.optionId}
            title={`Ver ${option?.summary?.descripcion ?? "oferta"}`}
            onPress={() => router.replace({ pathname: "/(conversation)/offer", params: {
              conversationId: publication.conversationId,
              title: requestReference.title ?? "Conversación",
            } })} />;
        })}
        <Button title="Agregar otra oferta" onPress={() => { void (async () => {
          const seed = await getOrCreateCurrentSellerOfferSeedConversation(requestReference.id);
          if (!seed.ok) {
            showError("No se pudo agregar otra oferta", seed.error.message);
            return;
          }
          router.replace({ pathname: "/(modal)/offer", params: {
            title: "Agregar otra oferta", conversationId: seed.data.id,
            purchaseRequestId: requestReference.id, mode: "batch",
          } });
        })(); }} />
      </View> : options.length > 0 ? <View style={{ gap: t.spacing.md }}>
        <Text variant="subtitle">Revisa y selecciona tus ofertas</Text>
        <Text variant="small" color="textMedium">
          Puedes enviar solo las opciones completas. Las que no selecciones se descartarán al publicar.
        </Text>
        {options.map((option, index) => {
          const selected = selectedIds.includes(option.id);
          const rows = getOfferSummaryDetails(option.summary, option.offerImages.length)
            .filter((row) => row.value != null && row.value !== "")
            .map((row) => ({ label: row.label, value: String(row.value) }));
          return <Pressable key={option.id} accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled: !option.isReadyToSend }}
            disabled={!option.isReadyToSend || busy}
            onPress={() => setSelectedIds((current) => selected
              ? current.filter((id) => id !== option.id) : [...current, option.id])}
            style={[createRoundedSurfaceStyle(t), {
              padding: t.spacing.md, gap: t.spacing.sm,
              borderWidth: 1, borderColor: selected ? t.colors.primary : t.colors.border,
              opacity: option.isReadyToSend ? 1 : 0.75,
            }]}>
            <Text variant="subtitle">{selected ? "☑" : "☐"} Opción {index + 1}</Text>
            <Text>{option.summary?.descripcion ?? "Descripción pendiente"}</Text>
            {rows.map((row) => <View key={row.label} style={{ flexDirection: "row", gap: t.spacing.sm }}>
              <Text variant="small" color="textMedium" style={{ flex: 1 }}>{row.label}</Text>
              <Text variant="small" style={{ flex: 1, textAlign: "right" }}>{row.value}</Text>
            </View>)}
            <OfferPhotos images={option.offerImages} />
            {option.missingFields.length ? <Text variant="small" color="error">
              Falta: {option.missingFields.join(", ")}
            </Text> : null}
            {option.reviewReason ? <Text variant="small" color="error">{option.reviewReason}</Text> : null}
          </Pressable>;
        })}
        <Button title={`Enviar ${selectedIds.length} oferta${selectedIds.length === 1 ? "" : "s"}`}
          disabled={busy || selectedIds.length === 0} loading={busy} onPress={publish} />
      </View> : initialized ? <Text color="textMedium">
        Cuéntame las opciones que puedes ofrecer, sus precios y qué fotos corresponden a cada una.
      </Text> : null}
    </ScrollView>
    {status !== "sent" ? <View style={{ paddingTop: t.spacing.sm,
      paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, t.spacing.md)
        : Platform.OS === "android" && !isAndroidKeyboardVisible ? Math.max(insets.bottom, t.spacing.sm) : t.spacing.sm,
    }}><InputChat disabled={!initialized || busy} busy={busy} clearOnSendStart
      onStop={() => {
        if (activeInputRef.current) setPendingRetry(activeInputRef.current);
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeInputRef.current = null;
        setBusy(false);
      }}
      maxChars={4000} maxImages={6}
      placeholder="Describe las opciones y adjunta fotos reales"
      onSend={handleSend} /></View> : null}
  </View>;
}

export default function OfferScreen() {
  const [profileId, setProfileId] = useState(() => getCurrentProfile()?.id ?? "");
  useEffect(() => {
    const unsubscribe = subscribeActiveProfile(() => setProfileId(getCurrentProfile()?.id ?? ""));
    return () => { unsubscribe(); };
  }, []);
  const params = useLocalSearchParams<{
    purchaseRequest?: string | string[];
    purchaseRequestId?: string | string[];
    conversationId?: string | string[];
    mode?: string | string[];
  }>();
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;

  return <OfferScreenContent key={`${profileId}:${mode ?? "create"}:${conversationId ?? ""}`} params={params} />;
}

function OfferScreenContent({ params }: { params: {
  purchaseRequest?: string | string[];
  purchaseRequestId?: string | string[];
  conversationId?: string | string[];
  mode?: string | string[];
} }) {
  const t = useTheme();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
  const rawMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode = rawMode === "edit" ? "edit" : rawMode === "batch" ? "batch" : "create";
  const [reference, setReference] = useState<RequestReference | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    setReference(null);
    void getOfferRequestReference(conversationId ?? "").then((result) => {
      if (!active) return;
      if (result.ok) setReference(result.data);
      else setError(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [conversationId, retry]);
  if (error) return (
    <View style={{ flex: 1, justifyContent: "center", gap: t.spacing.md }}>
      <Text>No pudimos cargar la solicitud del comprador. Inténtalo de nuevo.</Text>
      <Button title="Reintentar" onPress={() => setRetry((value) => value + 1)} />
      <Button title="Volver" onPress={() => router.back()} />
    </View>
  );
  if (!reference) return <LoadingState label="Cargando oferta..." />;
  if (mode === "batch") return <BatchOfferAssistantScreen
    conversationId={conversationId ?? ""} requestReference={reference} />;
  return <OfferAssistantScreen conversationId={conversationId} mode={mode}
    purchaseRequestTitle={reference.title} requestReference={reference} />;
}
