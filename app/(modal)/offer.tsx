import Button from "@/src/components/button/Button";
import ExpandableInfoCard from "@/src/components/expandableInfoCard/ExpandableInfoCard";
import FilePicker, {
  SelectedFile,
} from "@/src/components/filePicker/FilePicker";
import { Icon } from "@/src/components/Icon";
import InputChat, { type ChatImage } from "@/src/components/inputChat/inputChat";
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
import TextArea from "@/src/components/textArea/TextArea";
import TextFieldWithToggle from "@/src/components/textFieldWithToggle/TextFieldWithToggle";
import { useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { MODAL_TOP_BAR_HEIGHT } from "./modal-top-bar";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Animated,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DeliveryTimeOption = "horas" | "dias";
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

function AssistantMessageBubble({ message }: { message: AssistantMessage }) {
  const t = useTheme();
  const isUser = message.sender === "user";

  if (!isUser) {
    return (
      <View style={{ maxWidth: "96%", alignSelf: "flex-start", paddingVertical: t.spacing.xs }}>
        <Text variant="body">{message.text}</Text>
      </View>
    );
  }

  return (
    <View
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

function hasSummaryValue(value: string | number | null | undefined) {
  return value !== null && value !== undefined && value !== "";
}

function OfferSummaryCard({
  summary,
  missingFields,
  hasOfferPhoto,
  disabled,
  loading,
  onContinue,
  onPublish,
}: {
  summary: SellerOfferAssistantSummary | null;
  missingFields: string[];
  hasOfferPhoto: boolean;
  disabled: boolean;
  loading: boolean;
  onContinue: () => void;
  onPublish: () => void;
}) {
  const t = useTheme();
  const formattedPrice = formatSummaryMoney(summary?.precio, summary?.moneda);
  const formattedShippingPrice = formatSummaryMoney(
    summary?.precioEnvio,
    summary?.moneda
  );
  const deliveryText = summary?.entrega ?? null;
  const pickupText = summary?.retiroDespuesDeDias
    ? `${summary.retiroDespuesDeDias} día(s)`
    : null;
  const shippingText = summary?.envioMaximoDias
    ? `${summary.envioMaximoDias} día(s)`
    : null;
  const details = [
    { label: "Entrega", value: deliveryText },
    { label: "Moneda", value: summary?.moneda },
    { label: "Retiro después de", value: pickupText },
    { label: "Envío máximo", value: shippingText },
    { label: "Costo de envío", value: formattedShippingPrice },
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
      }}
    >
      <View
        style={{
          gap: t.spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: t.spacing.md,
          }}
        >
          <Text variant="label" color="stateAnulated">
            Resumen de la oferta
          </Text>
          <Text
            variant="subtitle"
            maxLines={1}
            style={{ color: t.colors.primary, flexShrink: 0 }}
          >
            {formattedPrice ?? "Precio pendiente"}
          </Text>
        </View>
        <Text variant="body">
          {summary?.descripcion ?? "Sin descripción todavía"}
        </Text>
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

      {missingFields.length > 0 ? (
        <View
          style={{
            borderRadius: 16,
            backgroundColor: t.colors.primaryLight,
            padding: t.spacing.sm,
            gap: t.spacing.xs,
          }}
        >
          <Text variant="caption" color="stateAnulated">
            Falta
          </Text>
          <Text variant="body">{missingFields.join(", ")}</Text>
        </View>
      ) : null}

      {!hasOfferPhoto ? (
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.colors.error,
            padding: t.spacing.sm,
          }}
        >
          <Text variant="body" color="error">
            Adjunta al menos una foto real de la oferta antes de enviarla.
          </Text>
        </View>
      ) : null}

      <View style={{ gap: t.spacing.sm }}>
        <Button
          title="Enviar oferta"
          icon="check"
          variant="dark"
          disabled={disabled || !hasOfferPhoto}
          loading={loading}
          onPress={onPublish}
        />
        <Button
          title="Seguir ajustando"
          icon="sliders-horizontal"
          variant="white"
          disabled={disabled}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

function ReadyToReviewCard({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useTheme();

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
            Oferta lista
          </Text>
          <Text variant="body">Revisa el resumen antes de enviarla</Text>
          <Text variant="caption" color="stateAnulated">
            Confirma precio, entrega y fotos.
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          {
            height: 46,
            borderRadius: t.borders.md,
            backgroundColor: t.colors.textDark,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: t.spacing.xs,
            opacity: disabled ? 0.6 : 1,
          },
          pressed && !disabled ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        <Text variant="label" style={{ color: t.colors.backgroudWhite }}>
          Revisar resumen
        </Text>
        <Icon name="arrow-right" size={18} color={t.colors.backgroudWhite} />
      </Pressable>
    </View>
  );
}

function OfferAssistantScreen({
  conversationId,
}: {
  conversationId: string | null | undefined;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
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
  const [pendingRetry, setPendingRetry] = useState<PendingAssistantRetry | null>(null);

  const hasOfferPhoto = successfulOfferPhotoCount > 0;

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
        setPendingRetry({ input, successfulImageCount });
        const retryText = result.retryAfterSeconds
          ? ` Puedes intentarlo de nuevo en ${result.retryAfterSeconds} segundo(s).`
          : "";
        showError("No se pudo procesar la oferta", `${result.error.message}${retryText}`);
        return;
      }

      setPendingRetry(null);
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

      appendAssistantMessage(
        result.assistantMessage,
        isSummaryAction ? "summary" : isReadyResult && !isContinueAction ? "ready" : undefined
      );

      if (result.status === "sent") {
        if (result.purchaseOfferId) {
          showSuccess("Oferta enviada");
          router.back();
          return;
        }

        showError(
          "No se pudo confirmar la oferta",
          "El asistente respondió como enviada, pero no devolvió la oferta final."
        );
      }
    },
    [appendAssistantMessage]
  );

  const executeAssistantRequest = useCallback(
    async (input: SellerOfferAssistantRequest, successfulImageCount = 0) => {
      setIsBusy(true);
      const result = await callSellerOfferAssistant(input);
      applyAssistantResult(result, input, successfulImageCount);
      setIsBusy(false);
    },
    [applyAssistantResult]
  );

  const handleSend = useCallback(
    async ({ text, images }: { text: string; images: ChatImage[] }) => {
      if (!conversationId) {
        showError("No se pudo crear la oferta", "No encontramos la conversación asociada.");
        return;
      }

      const userText = text.trim();
      if (!userText && images.length === 0) return;

      clearReviewState();
      setMessages((current) => [
        ...current,
        {
          id: createLocalId("user"),
          sender: "user",
          text: userText,
          images,
        },
      ]);

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
    [clearReviewState, conversationId, executeAssistantRequest, offerDraftId]
  );

  const handleShowSummary = useCallback(async () => {
    if (!offerDraftId) {
      showError("No hay resumen todavía", "Primero cuéntale al asistente los detalles de la oferta.");
      return;
    }

    setShowSummary(true);
    await executeAssistantRequest({
      prompt: "",
      offerDraftId,
      uiAction: "SHOW_SUMMARY",
      identity: createSellerOfferAssistantRequestIdentity("seller-offer-summary"),
    });
  }, [executeAssistantRequest, offerDraftId]);

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
      showError("No se pudo enviar", "Primero crea el borrador de la oferta.");
      return;
    }

    if (!hasOfferPhoto) {
      showError("Falta una foto", "Adjunta al menos una foto real de la oferta antes de enviarla.");
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
          scrollRef.current?.scrollToEnd({ animated: true });
        }}
        contentContainerStyle={{
          paddingTop: insets.top + MODAL_TOP_BAR_HEIGHT + t.spacing.lg,
          paddingBottom: t.spacing.lg,
          gap: t.spacing.md,
          flexGrow: 1,
        }}
      >
        {messages.length === 0 && !isBusy ? <OfferAssistantEmptyState /> : null}

        {messages.map((message) => (
          <AssistantMessageBubble key={message.id} message={message} />
        ))}

        {isBusy ? <AssistantThinkingBlock /> : null}

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

        {isReadyToSend && !showSummary && !isBusy && status !== "sent" ? (
          <ReadyToReviewCard
            disabled={isBusy}
            onPress={handleShowSummary}
          />
        ) : null}

        {showSummary ? (
          <OfferSummaryCard
            summary={summary}
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
          busy={isBusy}
          maxChars={4000}
          maxImages={6}
          placeholder="Describe tu oferta o adjunta fotos reales"
          onSend={handleSend}
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
  const [pickupDelayUnit, setPickupDelayUnit] =
    useState<DeliveryTimeOption>("horas");
  const [shippingCost, setShippingCost] = useState("");
  const [shippingCostCurrencyId, setShippingCostCurrencyId] = useState("");
  const [shippingMaxTime, setShippingMaxTime] = useState("");
  const [shippingMaxTimeUnit, setShippingMaxTimeUnit] =
    useState<DeliveryTimeOption>("horas");
  const [editDraft, setEditDraft] = useState<EditablePurchaseOfferDraft | null>(null);
  const [editDraftLoading, setEditDraftLoading] = useState(isEditMode);
  const [didApplyEditDraft, setDidApplyEditDraft] = useState(false);
  const resolvedPurchaseRequestId = purchaseRequestId ?? editDraft?.purchaseRequestId ?? null;
  const pickupCatalog = useMemo(
    () =>
      deliveryCatalog.find((item) => {
        const hint = normalize(item.hint);
        return hint.length > 0;
      }) ??
      null,
    [deliveryCatalog]
  );
  const shippingCatalog = useMemo(
    () => deliveryCatalog.find((item) => item.id !== pickupCatalog?.id) ?? null,
    [deliveryCatalog, pickupCatalog]
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

    let nextDeliveryMethodId: string | null = null;
    if (
      editDraft.primaryDeliveryCatalogId &&
      deliveryCatalog.some((item) => item.id === editDraft.primaryDeliveryCatalogId)
    ) {
      nextDeliveryMethodId = editDraft.primaryDeliveryCatalogId;
    } else if (
      pickupCatalog &&
      ((editDraft.pickupAfterValue ?? editDraft.pickupAfterDays ?? 0) > 0)
    ) {
      nextDeliveryMethodId = pickupCatalog.id;
    } else if (
      shippingCatalog &&
      ((editDraft.shippingMaxValue ?? editDraft.shippingMaxDays ?? 0) > 0 ||
        (editDraft.shippingPrice ?? 0) > 0)
    ) {
      nextDeliveryMethodId = shippingCatalog.id;
    }

    setDescription(editDraft.description);
    setPrice(
      Number.isFinite(editDraft.price) && editDraft.price > 0
        ? String(Math.trunc(editDraft.price))
        : ""
    );
    setCurrencyId(editDraft.currencyId);
    setFiles(editDraft.files as SelectedFile[]);
    setDeliveryMethods(nextDeliveryMethodId ? [nextDeliveryMethodId] : []);
    setPickupDelay(
      (editDraft.pickupAfterValue ?? editDraft.pickupAfterDays ?? 0) > 0
        ? String(editDraft.pickupAfterValue ?? editDraft.pickupAfterDays)
        : ""
    );
    setPickupDelayUnit(editDraft.pickupAfterUnit ?? "dias");
    setShippingCost(
      (editDraft.shippingPrice ?? 0) > 0 ? String(Math.trunc(editDraft.shippingPrice ?? 0)) : ""
    );
    setShippingCostCurrencyId(editDraft.currencyId);
    setShippingMaxTime(
      (editDraft.shippingMaxValue ?? editDraft.shippingMaxDays ?? 0) > 0
        ? String(editDraft.shippingMaxValue ?? editDraft.shippingMaxDays)
        : ""
    );
    setShippingMaxTimeUnit(editDraft.shippingMaxUnit ?? "dias");
    setDidApplyEditDraft(true);
  }, [
    deliveryCatalog,
    didApplyEditDraft,
    editDraft,
    isEditMode,
    pickupCatalog,
    shippingCatalog,
  ]);

  useEffect(() => {
    const firstCurrencyId = currencyToggleOptions[0]?.value ?? "";
    if (firstCurrencyId.length === 0) return;

    if (!currencyId || !currencyToggleOptions.some((option) => option.value === currencyId)) {
      setCurrencyId(firstCurrencyId);
    }

    if (
      !shippingCostCurrencyId ||
      !currencyToggleOptions.some((option) => option.value === shippingCostCurrencyId)
    ) {
      setShippingCostCurrencyId(firstCurrencyId);
    }
  }, [currencyId, shippingCostCurrencyId, currencyToggleOptions]);

  const handlePriceChange = (text: string) => {
    setPrice(text.replace(/\D/g, ""));
  };

  const handleDeliveryMethodsChange = useCallback((selectedIds: string[]) => {
    setDeliveryMethods(selectedIds.slice(-1));
  }, []);

  const selectedCurrency = currencies.find((currency) => currency.id === currencyId) ?? null;
  const selectedShippingCurrency =
    currencies.find((currency) => currency.id === shippingCostCurrencyId) ?? null;
  const isColonCurrency = normalize(selectedCurrency?.currency_code) === "col";
  const isShippingColonCurrency =
    normalize(selectedShippingCurrency?.currency_code) === "col";
  const priceLabel = isColonCurrency ? `₡${price}` : `$${price}`;
  const deliverySummary = deliveryMethods
    .map((method) => {
      const catalog = deliveryCatalog.find((item) => item.id === method);
      const displayName = catalog?.display_name ?? "Entrega";
      if (pickupCatalog && method === pickupCatalog.id) {
        if (!pickupDelay) return displayName;
        return `${displayName}: después de ${pickupDelay} ${pickupDelayUnit}.`;
      }
      if (shippingCatalog && method === shippingCatalog.id) {
        const costText = shippingCost
          ? `${isShippingColonCurrency ? "₡" : "$"}${shippingCost}`
          : "Sin costo definido";
        const timeText = shippingMaxTime
          ? `${shippingMaxTime} ${shippingMaxTimeUnit}`
          : "sin tiempo definido";
        return `${displayName}: ${costText}, tiempo máximo ${timeText}.`;
      }
      return displayName;
    })
    .join(" ");

  const handleConfirmOffer = useCallback(async () => {
    const primaryDeliveryCatalogId = deliveryMethods[0] ?? "";
    const selectedDeliveryMethods = primaryDeliveryCatalogId
      ? [primaryDeliveryCatalogId]
      : [];
    const isPickupSelected = Boolean(
      pickupCatalog && primaryDeliveryCatalogId === pickupCatalog.id
    );
    const isShippingSelected = Boolean(
      shippingCatalog && primaryDeliveryCatalogId === shippingCatalog.id
    );
    const pickupDelayValue = isPickupSelected ? Number(pickupDelay || 0) : 0;
    const shippingCostValue = isShippingSelected ? Number(shippingCost || 0) : 0;
    const shippingMaxTimeValue = isShippingSelected ? Number(shippingMaxTime || 0) : 0;

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
        primaryDeliveryCatalogId,
        files,
        deliveryMethods: selectedDeliveryMethods,
        pickupDelay: pickupDelayValue,
        pickupDelayUnit,
        shippingCost: shippingCostValue,
        shippingMaxTime: shippingMaxTimeValue,
        shippingMaxTimeUnit,
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

    showError("No se pudo guardar", "La creación de ofertas ahora se hace con el asistente.");
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
    pickupDelayUnit,
    pickupCatalog,
    price,
    purchaseRequest,
    shippingCatalog,
    shippingCost,
    shippingMaxTime,
    shippingMaxTimeUnit,
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
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
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
            description="Selecciona la opción que brindarás para esta oferta."
            allowMultiple={false}
            value={deliveryMethods}
            onChange={handleDeliveryMethodsChange}
            options={deliveryCatalog.map((delivery) => ({
              id: delivery.id,
              label: delivery.display_name ?? "-",
              hint: delivery.hint ?? undefined,
              content:
                pickupCatalog && delivery.id === pickupCatalog.id ? (
                  <View style={{ gap: t.spacing.xs }}>
                    <Text color="stateAnulated">Después de</Text>
                    <TextFieldWithToggle<DeliveryTimeOption>
                      value={pickupDelay}
                      onChangeText={(text) =>
                        setPickupDelay(text.replace(/\D/g, ""))
                      }
                      options={[
                        { label: "Hora(s)", value: "horas" },
                        { label: "Día(s)", value: "dias" },
                      ]}
                      selectedOption={pickupDelayUnit}
                      onOptionChange={setPickupDelayUnit}
                      keyboardType="number-pad"
                      inputMode="numeric"
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
                        selectedOption={
                          shippingCostCurrencyId || currencyToggleOptions[0]?.value || ""
                        }
                        onOptionChange={setShippingCostCurrencyId}
                        keyboardType="number-pad"
                        inputMode="numeric"
                      />
                    </View>

                    <View style={{ gap: t.spacing.xs }}>
                      <Text color="stateAnulated">Tiempo máximo de entrega</Text>
                      <TextFieldWithToggle<DeliveryTimeOption>
                        value={shippingMaxTime}
                        onChangeText={(text) =>
                          setShippingMaxTime(text.replace(/\D/g, ""))
                        }
                        options={[
                          { label: "Hora(s)", value: "horas" },
                          { label: "Día(s)", value: "dias" },
                        ]}
                        selectedOption={shippingMaxTimeUnit}
                        onOptionChange={setShippingMaxTimeUnit}
                        keyboardType="number-pad"
                        inputMode="numeric"
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
