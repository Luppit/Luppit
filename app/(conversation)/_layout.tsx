import { useFocusEffect } from "@react-navigation/native";
import ConversationActionButtons, {
  ConversationActionButtonConfig,
} from "@/src/components/conversation/ConversationActionButtons";
import Button from "@/src/components/button/Button";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { Icon } from "@/src/components/Icon";
import InputChat from "@/src/components/inputChat/inputChat";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import { lucideIcons, LucideIconName } from "@/src/icons/lucide";
import { getSession } from "@/src/lib/supabase";
import { supabase } from "@/src/lib/supabase/client";
import type { AppError } from "@/src/lib/supabase/errors";
import {
  closePopup,
  openPopup,
  PopupOption,
  PopupSummaryActionOutcome,
} from "@/src/services/popup.service";
import {
  ConversationMessage,
  createConversationMessages,
} from "@/src/services/conversation.message.service";
import {
  ConversationView,
  ConversationViewAction,
  executeConversationActionByExecutor,
  getCurrentProfileConversationById,
  getCurrentUserConversationView,
} from "@/src/services/conversation.service";
import {
  addCurrentBuyerPurchaseRequestFavorite,
  addCurrentSellerPurchaseRequestFavorite,
} from "@/src/services/purchase.request.service";
import {
  clearToastBottomInset,
  setToastBottomInset,
} from "@/src/services/toast.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showInfo, showSuccess, showWarning } from "@/src/utils/useToast";
import { Redirect, Slot, router, useGlobalSearchParams } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOAST_INSET_SOURCE = "conversation-composer";

type ConversationActionFailure = {
  message: string;
  code?: string;
};

function didReissueTransactionCode(code: string | undefined) {
  return (
    code === "transaction_code_expired_new_code_sent" ||
    code === "transaction_code_not_found_new_code_sent"
  );
}

function isTransactionCodeInputError(code: string | undefined) {
  return (
    code === "invalid_transaction_code" ||
    code === "invalid_transaction_code_format" ||
    code === "otp_required"
  );
}

function isUnavailableConversationError(error: AppError | null) {
  return error?.type === "auth" || error?.type === "not_found";
}

function openConfirmationClientTarget(target: string) {
  if (target !== "modal.email_setup") return false;

  closePopup();
  router.push({
    pathname: "/(modal)/email-setup",
    params: { title: "Configurar correo" },
  });
  return true;
}

type ConversationLayoutContextValue = {
  conversationId: string;
  profileId: string;
  conversationView: ConversationView;
  auxActions: ConversationViewAction[];
  showComposer: boolean;
  onActionPress: (action: ConversationViewAction) => void;
  isExecutingAction: boolean;
  refreshConversation: () => Promise<void>;
  messageRefreshTick: number;
  optimisticMessages: ConversationMessage[];
  clearOptimisticMessages: (messageIds: string[]) => void;
  contentTopInset: number;
  contentBottomInset: number;
};

const ConversationLayoutContext = createContext<ConversationLayoutContextValue | null>(
  null
);

export function useConversationLayout() {
  const value = useContext(ConversationLayoutContext);
  if (!value) {
    throw new Error("useConversationLayout must be used inside /(conversation) layout");
  }
  return value;
}

function parseStringParam(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

function normalizeIcon(icon: string | null): LucideIconName {
  if (icon && icon in lucideIcons) return icon as LucideIconName;
  return "ellipsis";
}

function normalizeOptionalIcon(icon: string | null | undefined): LucideIconName | undefined {
  if (!icon) return undefined;
  if (icon in lucideIcons) return icon as LucideIconName;
  return undefined;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function normalizeStyleFlags(styleCode: string | null) {
  const value = normalizeText(styleCode);
  const isDanger =
    value.includes("error") ||
    value.includes("danger") ||
    value.includes("destructive") ||
    value.includes("reject") ||
    value.includes("cancel");
  const isPrimary =
    value.includes("primary") ||
    value.includes("success") ||
    value.includes("positive") ||
    value.includes("confirm");

  return { isDanger, isPrimary };
}

function toTopButtonConfig(action: ConversationViewAction): ConversationActionButtonConfig {
  const { isDanger, isPrimary } = normalizeStyleFlags(action.style_code);

  return {
    id: action.id,
    label: action.label || action.code || "",
    icon: normalizeIcon(action.icon),
    backgroundColorKey: isPrimary ? "primary" : "backgroudWhite",
    textColorKey: isDanger ? "error" : isPrimary ? "backgroudWhite" : "textDark",
    iconColorKey: isDanger ? "error" : isPrimary ? "backgroudWhite" : "textDark",
  };
}

function toMenuOptionConfig(action: ConversationViewAction): PopupOption {
  const { isDanger, isPrimary } = normalizeStyleFlags(action.style_code);

  return {
    id: action.id,
    label: action.label || action.code || "",
    icon: normalizeOptionalIcon(action.icon),
    textColorKey: isDanger ? "error" : isPrimary ? "primary" : "textDark",
    iconColorKey: isDanger ? "error" : isPrimary ? "primary" : "textDark",
  };
}

function getAuxActionTextColor(styleCode: string | null, theme: Theme) {
  const { isDanger, isPrimary } = normalizeStyleFlags(styleCode);

  if (isDanger) return theme.colors.error;
  if (isPrimary) return theme.colors.primary;
  return theme.colors.textDark;
}

function isBlackAuxAction(styleCode: string | null) {
  return normalizeText(styleCode).includes("black");
}

function createOptimisticMessageId(index: number) {
  return `optimistic-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`;
}

function createClientRequestId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function interpolateTemplate(
  template: string,
  context: Record<string, unknown>
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = context[key];
    return value == null ? "" : String(value);
  });
}

function toStringValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  return String(value);
}

type RatingPayload = {
  stars: number;
  tags: string[];
  comment: string;
};

type ConversationRealtimeRefreshTarget = "view" | "messages";

type ConversationRealtimePayload = {
  conversation_id?: string;
  reason?: string;
  refresh?: unknown;
};

const realtimeRefreshDelayMs = 200;

function isRatingPayload(value: unknown): value is RatingPayload {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Record<string, unknown>;
  return (
    typeof parsed.stars === "number" &&
    Array.isArray(parsed.tags) &&
    typeof parsed.comment === "string"
  );
}

function getRealtimeRefreshTargets(
  payload: ConversationRealtimePayload
): ConversationRealtimeRefreshTarget[] {
  if (!Array.isArray(payload.refresh)) return ["view", "messages"];

  const targets = payload.refresh.filter(
    (target): target is ConversationRealtimeRefreshTarget =>
      target === "view" || target === "messages"
  );

  return targets.length > 0 ? targets : ["view", "messages"];
}

function didPurgeConversationResult(value: unknown, conversationId: string) {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  const purgedConversationId =
    typeof result.purged_conversation_id === "string"
      ? result.purged_conversation_id
      : typeof result.deleted_conversation_id === "string"
        ? result.deleted_conversation_id
        : null;

  return result.conversation_deleted === true || purgedConversationId === conversationId;
}

function getActionSuccessMessage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Acción completada";
  }

  const message = (value as Record<string, unknown>).success_message;
  return typeof message === "string" && message.trim()
    ? message.trim()
    : "Acción completada";
}

export default function ConversationLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useGlobalSearchParams<{
    conversationId?: string | string[];
    title?: string | string[];
  }>();
  const [conversationView, setConversationView] = useState<ConversationView | null>(
    null
  );
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [messageRefreshTick, setMessageRefreshTick] = useState(0);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [composerOverlayHeight, setComposerOverlayHeight] = useState(0);
  const [purchaseRequestTitle, setPurchaseRequestTitle] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ConversationMessage[]>(
    []
  );
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const realtimeRefreshTargetsRef = useRef<Set<ConversationRealtimeRefreshTarget>>(
    new Set()
  );
  const isExecutingActionRef = useRef(false);

  const conversationId = useMemo(
    () => parseStringParam(params.conversationId),
    [params.conversationId]
  );
  const routeTitle = useMemo(() => parseStringParam(params.title), [params.title]);
  const purchaseRequestId = conversationView?.conversation.purchase_request_id ?? null;
  const showComposer = conversationView?.permissions.can_send_messages ?? false;

  useEffect(() => {
    if (!showComposer) {
      clearToastBottomInset(TOAST_INSET_SOURCE);
    }

    return () => clearToastBottomInset(TOAST_INSET_SOURCE);
  }, [showComposer]);

  useEffect(() => {
    if (!conversationId) {
      setPurchaseRequestTitle(null);
      return;
    }

    let active = true;

    const loadPurchaseRequestTitle = async () => {
      const result = await getCurrentProfileConversationById(conversationId);
      if (!active) return;

      if (!result.ok) {
        setPurchaseRequestTitle(null);
        return;
      }

      setPurchaseRequestTitle(result.data.request_title?.trim() || null);
    };

    void loadPurchaseRequestTitle();

    return () => {
      active = false;
    };
  }, [conversationId]);

  useEffect(() => {
    setOptimisticMessages([]);
  }, [conversationId]);

  const clearOptimisticMessages = useCallback((messageIds: string[]) => {
    if (messageIds.length === 0) return;

    const idSet = new Set(messageIds);
    setOptimisticMessages((current) =>
      current.filter((message) => !idSet.has(message.id))
    );
  }, []);

  const buildOptimisticMessages = useCallback(
    (text: string, images: { uri: string }[]) => {
      if (!conversationId || !profileId) return [];

      const now = Date.now();
      const nextMessages: ConversationMessage[] = [];
      const trimmed = text.trim();

      if (trimmed) {
        nextMessages.push({
          id: createOptimisticMessageId(nextMessages.length),
          conversation_id: conversationId,
          sender_profile_id: profileId,
          text: trimmed,
          message_kind: "TEXT",
          image_path: null,
          image_url: null,
          visible_to_role_id: null,
          buyer_open_state: null,
          buyer_opened_at: null,
          seller_open_state: null,
          seller_opened_at: null,
          created_at: new Date(now).toISOString(),
        });
      }

      images.forEach((image) => {
        nextMessages.push({
          id: createOptimisticMessageId(nextMessages.length),
          conversation_id: conversationId,
          sender_profile_id: profileId,
          text: null,
          message_kind: "IMAGE",
          image_path: null,
          image_url: image.uri,
          visible_to_role_id: null,
          buyer_open_state: null,
          buyer_opened_at: null,
          seller_open_state: null,
          seller_opened_at: null,
          created_at: new Date(now + nextMessages.length).toISOString(),
        });
      });

      return nextMessages;
    },
    [conversationId, profileId]
  );

  const refreshConversation = useCallback(async () => {
    if (!conversationId) return;

    const result = await getCurrentUserConversationView(conversationId);
    if (!result.ok) {
      setLoadError(result.error);
      setConversationView(null);
      setProfileId(null);
      setIsLoading(false);
      return;
    }

    setLoadError(null);
    setConversationView(result.data);
    setProfileId(result.profileId);
    setIsLoading(false);
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void refreshConversation();
    }, [refreshConversation])
  );

  useEffect(() => {
    if (!conversationId) return;

    let isActive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const clearPendingRefresh = () => {
      if (!realtimeRefreshTimeoutRef.current) return;
      clearTimeout(realtimeRefreshTimeoutRef.current);
      realtimeRefreshTimeoutRef.current = null;
      realtimeRefreshTargetsRef.current.clear();
    };

    const scheduleRefresh = (payload: ConversationRealtimePayload) => {
      if (payload.conversation_id && payload.conversation_id !== conversationId) {
        return;
      }

      const targets = getRealtimeRefreshTargets(payload);
      targets.forEach((target) => realtimeRefreshTargetsRef.current.add(target));

      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
      }

      realtimeRefreshTimeoutRef.current = setTimeout(() => {
        realtimeRefreshTimeoutRef.current = null;
        if (!isActive) return;

        const pendingTargets = Array.from(realtimeRefreshTargetsRef.current);
        realtimeRefreshTargetsRef.current.clear();

        if (pendingTargets.includes("view")) {
          void refreshConversation();
        }

        if (pendingTargets.includes("messages")) {
          setMessageRefreshTick((prev) => prev + 1);
        }
      }, realtimeRefreshDelayMs);
    };

    const subscribe = async () => {
      const session = await getSession();
      if (!isActive) return;

      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (!isActive) return;

      const nextChannel = supabase.channel(`conversation:${conversationId}`, {
        config: { private: true },
      });

      channel = nextChannel;
      nextChannel
        .on(
          "broadcast",
          { event: "conversation_changed" },
          ({ payload }: { payload: ConversationRealtimePayload }) => {
            scheduleRefresh(payload ?? {});
          }
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      isActive = false;
      clearPendingRefresh();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [conversationId, refreshConversation]);

  const runAction = useCallback(
    async (
      action: ConversationViewAction,
      payload?: Record<string, unknown> | null,
      onFailure?: (error: ConversationActionFailure) => void
    ) => {
      if (!conversationId || !profileId) return false;
      if (!action.code) {
        showError("Acción no disponible", "Esta acción no tiene código de ejecución.");
        return false;
      }
      if (
        !action.executor ||
        !action.executor.target.trim() ||
        (action.executor.execution_type !== "server_rpc" &&
          action.executor.execution_type !== "client_command")
      ) {
        showError(
          "Acción no disponible",
          "Esta acción tiene una configuración incompleta."
        );
        return false;
      }
      if (isExecutingActionRef.current) return false;

      isExecutingActionRef.current = true;
      setIsExecutingAction(true);

      try {
        let result:
          | { ok: true; data: unknown }
          | { ok: false; error: ConversationActionFailure };

        if (action.executor?.execution_type === "server_rpc") {
          result = await executeConversationActionByExecutor({
            conversationId,
            profileId,
            actionCode: action.code,
            payload: payload ?? null,
            executor: action.executor,
          });
        } else if (action.executor?.execution_type === "client_command") {
          if (action.executor.target === "modal.offer") {
            if (!purchaseRequestId) {
              showError(
                "No se pudo abrir la oferta",
                "La conversación no tiene una solicitud asociada."
              );
              return false;
            }

            router.push({
              pathname: "/(modal)/offer",
              params: {
                title: "Crear oferta",
                purchaseRequestId,
                conversationId,
              },
            });
          } else if (action.executor.target === "modal.offer.edit") {
            router.push({
              pathname: "/(modal)/offer",
              params: {
                title: "Modificar oferta",
                conversationId,
                mode: "edit",
                ...(purchaseRequestId ? { purchaseRequestId } : null),
              },
            });
          } else if (action.executor.target === "detail.faq") {
            router.push({
              pathname: "/(detail)/faq",
              params: { title: "Ayuda", hideMenu: "true" },
            });
          } else if (action.executor.target === "detail.seller_business") {
            router.push({
              pathname: "/(detail)/seller-business",
              params: {
                title: "Negocio",
                hideMenu: "true",
                conversationId,
              },
            });
          } else if (action.executor.target === "favorite.toggle") {
            if (!purchaseRequestId) {
              showError(
                "No se pudo agregar a favoritos",
                "La conversación no tiene una solicitud asociada."
              );
              return false;
            }

            const favoriteResult =
              conversationView?.role_code === "BUYER"
                ? await addCurrentBuyerPurchaseRequestFavorite(purchaseRequestId)
                : conversationView?.role_code === "SELLER"
                  ? await addCurrentSellerPurchaseRequestFavorite(purchaseRequestId)
                  : null;

            if (!favoriteResult) {
              showError(
                "No se pudo agregar a favoritos",
                "No pudimos determinar tu rol en esta conversación."
              );
              return false;
            }

            if (!favoriteResult.ok) {
              showError("No se pudo agregar a favoritos", favoriteResult.error.message);
              return false;
            }

            if (favoriteResult.data.alreadyExists) {
              showInfo("Ya estaba en favoritos");
            } else {
              showSuccess("Favorito agregado");
            }
          } else if (action.executor.target !== "popup.close") {
            showError(
              "Acción no disponible",
              "Esta acción tiene una configuración no reconocida."
            );
            return false;
          }
          result = { ok: true, data: null };
        } else {
          showError(
            "Acción no disponible",
            "Esta acción tiene una configuración incompleta."
          );
          return false;
        }

        if (!result.ok) {
          if (onFailure) {
            onFailure(result.error);
          } else {
            showError("No se pudo ejecutar la acción", result.error.message);
          }
          return false;
        }

        const shouldRefresh = action.executor?.requires_refresh ?? true;
        const conversationWasPurged = didPurgeConversationResult(result.data, conversationId);
        if (conversationWasPurged) {
          showSuccess(getActionSuccessMessage(result.data));
          router.replace("/(tabs)/chats");
          return true;
        }

        if (shouldRefresh) {
          await refreshConversation();
          setMessageRefreshTick((prev) => prev + 1);
        }

        if (action.executor?.execution_type !== "client_command") {
          showSuccess(getActionSuccessMessage(result.data));
        }

        return true;
      } catch {
        const error = { message: "Ocurrió un error, intenta de nuevo." };
        if (onFailure) {
          onFailure(error);
        } else {
          showError("No se pudo ejecutar la acción", error.message);
        }
        return false;
      } finally {
        isExecutingActionRef.current = false;
        setIsExecutingAction(false);
      }
    },
    [
      conversationId,
      profileId,
      conversationView?.role_code,
      purchaseRequestId,
      refreshConversation,
    ]
  );

  const handleActionPress = useCallback(
    (action: ConversationViewAction) => {
      const confirmation = action.confirmation;
      if (!confirmation) {
        void runAction(action);
        return;
      }

      const clientRequestId =
        action.code === "REPORT_CONVERSATION" ? createClientRequestId() : null;
      const inputValues: Record<string, unknown> = {
        ...confirmation.payload_defaults,
        ...(clientRequestId ? { client_request_id: clientRequestId } : null),
      };
      const description = interpolateTemplate(
        confirmation.description_template,
        conversationView?.context ?? {}
      );
      const rows = confirmation.fields.map((field) => ({
        label: field.label,
        value: toStringValue(field.value),
      }));
      const inputs = confirmation.inputs.map((input) => ({
        id: input.id,
        kind: input.kind,
        payload_key: input.payload_key,
        label: input.label,
        helper_text: input.helper_text,
        otp_length: input.otp_length,
        component_config: input.component_config,
        options: input.options.map((option) => ({
          value: option.value,
          methodKind: option.method_kind,
          label: option.label,
          feeLabel: option.fee_label,
          totalLabel: option.total_label,
          timingLabel: option.timing_label,
          availabilityLabel: option.availability_label,
          disabled: option.disabled,
          disabledReason: option.disabled_reason,
          setupActionLabel: option.setup_action?.label,
          onSetupPress:
            option.setup_action &&
            option.setup_action.target === "modal.email_setup"
              ? () => openConfirmationClientTarget(option.setup_action!.target)
              : undefined,
        })),
        is_required: input.is_required,
        onValueChange: (value: unknown) => {
          inputValues[input.payload_key] = value;
        },
      }));
      const ratingInputTitle =
        confirmation.inputs.find((input) => input.kind === "rating")?.label ?? null;
      const confirmStyle = normalizeStyleFlags(confirmation.confirm_style_code);
      const hasUnavailableRequiredChoice = confirmation.inputs.some(
        (input) =>
          input.kind === "choice" &&
          input.is_required &&
          input.options.length === 0
      );

      openPopup({
        type: "summary",
        title: ratingInputTitle || confirmation.title,
        description,
        rows,
        inputs,
        blocker: confirmation.blocker
          ? {
              message: confirmation.blocker.message,
              actionLabel: confirmation.blocker.action_label,
              onActionPress:
                confirmation.blocker.action_target === "modal.email_setup"
                  ? () =>
                      openConfirmationClientTarget(
                        confirmation.blocker!.action_target!
                      )
                  : undefined,
            }
          : null,
        actions: [
          {
            id: `${action.id}-cancel`,
            label: confirmation.cancel_label || "Volver",
            icon: normalizeOptionalIcon(confirmation.cancel_icon),
            backgroundColorKey: "backgroudWhite",
            textColorKey: "textDark",
            iconColorKey: "textDark",
          },
          {
            id: `${action.id}-confirm`,
            label: confirmation.confirm_label || action.label || "Confirmar",
            icon: normalizeOptionalIcon(confirmation.confirm_icon),
            backgroundColorKey: confirmStyle.isPrimary ? "primary" : "backgroudWhite",
            textColorKey: confirmStyle.isPrimary
              ? "backgroudWhite"
              : confirmStyle.isDanger
                ? "error"
                : "textDark",
            iconColorKey: confirmStyle.isPrimary
              ? "backgroudWhite"
              : confirmStyle.isDanger
                ? "error"
                : "textDark",
            disabled:
              confirmation.blocker != null || hasUnavailableRequiredChoice,
            onPress: () => {
              const missingInputs = confirmation.inputs.filter((input) => {
                if (!input.is_required) return false;

                const raw = inputValues[input.payload_key];
                if (input.kind === "rating") {
                  return !isRatingPayload(raw) || raw.stars < 1;
                }

                const value = typeof raw === "string" ? raw.trim() : "";
                return !value;
              });

              if (missingInputs.length > 0) {
                const labels = Array.from(
                  new Set(missingInputs.map((input) => input.label.trim()))
                ).filter(Boolean);
                return {
                  shouldClose: false,
                  feedback: {
                    tone: "warning",
                    title: "Faltan datos",
                    message: `Completa: ${labels.join(", ")}.`,
                    presentation: "toast",
                  },
                } satisfies PopupSummaryActionOutcome;
              }

              const invalidInput = confirmation.inputs.find((input) => {
                const raw = inputValues[input.payload_key];

                if (input.kind === "otp") {
                  const value = typeof raw === "string" ? raw.trim() : "";
                  if (value && value.length !== input.otp_length) return true;
                  return false;
                }

                if (input.kind === "rating") {
                  return false;
                }

                if (input.kind === "choice") {
                  const value = typeof raw === "string" ? raw.trim() : "";
                  if (input.options.length === 0) return true;
                  if (!value) return false;
                  return !input.options.some(
                    (option) => option.value === value && !option.disabled
                  );
                }

                const value = typeof raw === "string" ? raw.trim() : "";
                if (
                  input.kind === "textarea" &&
                  typeof input.component_config?.max_length === "number" &&
                  value.length > input.component_config.max_length
                ) {
                  return true;
                }
                return false;
              });

              if (invalidInput) {
                const invalidRawValue = inputValues[invalidInput.payload_key];
                const invalidTextLength =
                  typeof invalidRawValue === "string"
                    ? invalidRawValue.trim().length
                    : 0;
                const message =
                  invalidInput.kind === "otp"
                    ? `Ingresa un código de ${invalidInput.otp_length} dígitos.`
                    : invalidInput.kind === "rating"
                      ? "Selecciona una calificación en estrellas."
                    : invalidInput.kind === "choice"
                      ? invalidInput.options.length === 0
                        ? "Las opciones no se pudieron cargar. Actualiza la conversación."
                        : "Selecciona una opción."
                      : invalidInput.kind === "textarea" &&
                          typeof invalidInput.component_config?.max_length ===
                            "number" &&
                          invalidTextLength >
                            invalidInput.component_config.max_length
                        ? `Usa ${invalidInput.component_config.max_length} caracteres o menos.`
                      : "Revisa el valor ingresado.";
                if (
                  invalidInput.kind === "otp" ||
                  invalidInput.kind === "rating" ||
                  invalidInput.kind === "choice" ||
                  invalidInput.kind === "textarea"
                ) {
                  return {
                    shouldClose: false,
                    inputErrors: { [invalidInput.id]: message },
                  } satisfies PopupSummaryActionOutcome;
                }

                return {
                  shouldClose: false,
                  feedback: {
                    tone: "warning",
                    title: "Dato incompleto",
                    message,
                  },
                } satisfies PopupSummaryActionOutcome;
              }

              const payload = confirmation.inputs.reduce<Record<string, unknown>>(
                (acc, input) => {
                  const raw = inputValues[input.payload_key];

                  if (input.kind === "rating") {
                    if (isRatingPayload(raw) && raw.stars >= 1) {
                      acc[input.payload_key] = raw;
                    }
                    return acc;
                  }

                  if (input.kind === "choice") {
                    const value = typeof raw === "string" ? raw.trim() : "";
                    const selectedOption = input.options.find(
                      (option) => option.value === value && !option.disabled
                    );
                    if (selectedOption) {
                      acc[input.payload_key] = selectedOption.value;
                    }
                    return acc;
                  }

                  const value = typeof raw === "string" ? raw.trim() : "";
                  if (value) {
                    acc[input.payload_key] = value;
                  }
                  return acc;
                },
                {
                  ...confirmation.payload_defaults,
                  ...(clientRequestId
                    ? { client_request_id: clientRequestId }
                    : null),
                }
              );
              const actionPayload = Object.keys(payload).length > 0 ? payload : null;

              return (async (): Promise<boolean | PopupSummaryActionOutcome> => {
                let failure: ConversationActionFailure | null = null;
                const succeeded = await runAction(action, actionPayload, (error) => {
                  failure = error;
                });

                if (succeeded) return true;

                const error = failure as ConversationActionFailure | null;
                if (error?.code === "offer_changed") {
                  closePopup();
                  await refreshConversation();
                  showWarning(
                    "La oferta cambió",
                    error.message ||
                      "Revísala nuevamente antes de concretar la compra."
                  );
                  return false;
                }
                const codeWasReissued = didReissueTransactionCode(error?.code);
                const otpInputIds = confirmation.inputs
                  .filter((input) => input.kind === "otp")
                  .map((input) => input.id);
                const isOtpInputError =
                  isTransactionCodeInputError(error?.code) && otpInputIds.length > 0;
                const inputErrors = isOtpInputError
                  ? otpInputIds.reduce<Record<string, string>>((acc, inputId) => {
                      acc[inputId] =
                        error?.message ?? "El código no es válido. Inténtalo de nuevo.";
                      return acc;
                    }, {})
                  : undefined;

                return {
                  shouldClose: false,
                  feedback: isOtpInputError
                    ? undefined
                    : {
                        tone: codeWasReissued ? "success" : "error",
                        title: codeWasReissued
                          ? "Nuevo código enviado"
                          : "No se pudo completar la acción",
                        message: codeWasReissued
                          ? "El comprador recibió un código nuevo. Solicítalo para finalizar."
                          : error?.message ?? "Ocurrió un error, intenta de nuevo.",
                      },
                  inputErrors,
                  resetInputIds: codeWasReissued
                    ? otpInputIds
                    : undefined,
                };
              })();
            },
          },
        ],
      });
    },
    [conversationView?.context, refreshConversation, runAction]
  );

  const openConversationMenu = useCallback(
    (actions: ConversationViewAction[]) => {
      if (actions.length === 0) return;

      openPopup({
        options: actions.map((action) => ({
          ...toMenuOptionConfig(action),
          onPress: () => handleActionPress(action),
        })),
      });
    },
    [handleActionPress]
  );

  const handleComposerOverlayLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.ceil(event.nativeEvent.layout.height);
    setComposerOverlayHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight
    );
    setToastBottomInset(TOAST_INSET_SOURCE, nextHeight + t.spacing.sm);
  }, [t.spacing.sm]);

  if (!conversationId) return <Redirect href="/(tabs)" />;

  if (isLoading) {
    return <LoadingState label="Cargando conversación..." />;
  }

  if (!conversationView || !profileId) {
    const isUnavailable = isUnavailableConversationError(loadError);

    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: t.spacing.xl,
          gap: t.spacing.md,
          backgroundColor: t.colors.background,
        }}
      >
        <Text variant="body" align="center">
          {isUnavailable
            ? "Esta conversación no está disponible."
            : loadError?.message ?? "No se pudo cargar la conversación."}
        </Text>
        <Button
          title={isUnavailable ? "Volver" : "Reintentar"}
          onPress={() => {
            if (isUnavailable) {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/chats");
              }
              return;
            }

            setIsLoading(true);
            void refreshConversation();
          }}
        />
      </View>
    );
  }

  const topActions = conversationView.actions
    .filter((action) => (action.ui_slot ?? "").toUpperCase() === "TOP")
    .map(toTopButtonConfig);
  const topActionsSignature = topActions
    .map(
      (action) =>
        `${action.id}:${action.label}:${action.icon}:${action.backgroundColorKey}:${action.textColorKey}:${action.iconColorKey}`
    )
    .join("|");
  const topActionsById = new Map(
    conversationView.actions
      .filter((action) => (action.ui_slot ?? "").toUpperCase() === "TOP")
      .map((action) => [action.id, action] as const)
  );
  const auxActions = conversationView.actions.filter(
    (action) => (action.ui_slot ?? "").toUpperCase() === "AUX"
  );
  const menuActions = conversationView.actions.filter(
    (action) => (action.ui_slot ?? "").toUpperCase() === "MENU"
  );
  const showActionButtons = topActions.length > 0;
  const headerBarHeight = 56;
  const headerChromeHeight = insets.top + 72;
  const actionButtonsOverlaySpace = showActionButtons ? 64 + t.spacing.md : 0;
  const composerOverlayFallbackHeight =
    showComposer ? Math.max(insets.bottom, t.spacing.sm) + 88 : 0;
  const contentTopInset = headerChromeHeight + actionButtonsOverlaySpace;
  const contentBottomInset = showComposer
    ? composerOverlayHeight || composerOverlayFallbackHeight
    : 0;
  const title = purchaseRequestTitle ?? routeTitle ?? "Conversación";

  const providerValue: ConversationLayoutContextValue = {
    conversationId,
    profileId,
    conversationView,
    auxActions,
    showComposer,
    onActionPress: handleActionPress,
    isExecutingAction,
    refreshConversation,
    messageRefreshTick,
    optimisticMessages,
    clearOptimisticMessages,
    contentTopInset,
    contentBottomInset,
  };

  return (
    <ConversationLayoutContext.Provider value={providerValue}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: t.colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
          <GlassSurface
            variant="chrome"
            blur="chrome"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              elevation: Platform.OS === "android" ? 4 : 10,
              height: headerChromeHeight,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: t.glass.radius.chrome,
              borderBottomRightRadius: t.glass.radius.chrome,
            }}
            clipStyle={{
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              borderBottomLeftRadius: t.glass.radius.chrome,
              borderBottomRightRadius: t.glass.radius.chrome,
              overflow: "hidden",
            }}
            contentStyle={{
              flex: 1,
              paddingTop: insets.top + t.spacing.xs,
              paddingHorizontal: t.spacing.xl,
              paddingBottom: t.spacing.xs,
            }}
          >
            <View
              style={{
                height: headerBarHeight,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                style={{ width: 40, alignItems: "flex-start", justifyContent: "center" }}
              >
                <Icon name="arrow-left" size={28} />
              </Pressable>

              <Text variant="subtitle" align="center" maxLines={1} style={{ flex: 1 }}>
                {title}
              </Text>

              {menuActions.length > 0 ? (
                <Pressable
                  onPress={() => openConversationMenu(menuActions)}
                  disabled={isExecutingAction}
                  hitSlop={12}
                  style={{
                    width: 40,
                    alignItems: "flex-end",
                    justifyContent: "center",
                    opacity: isExecutingAction ? 0.6 : 1,
                  }}
                >
                  <Icon name="ellipsis" size={28} />
                </Pressable>
              ) : (
                <View style={{ width: 40 }} />
              )}
            </View>
          </GlassSurface>

          {showActionButtons ? (
            <View
              style={{
                position: "absolute",
                top: headerChromeHeight - t.spacing.xs,
                left: 0,
                right: 0,
                zIndex: 10,
                elevation: Platform.OS === "android" ? 4 : 10,
                alignItems: "center",
                backgroundColor: "transparent",
              }}
              pointerEvents="box-none"
            >
              <ConversationActionButtons
                key={topActionsSignature}
                buttons={topActions}
                onPress={(id) => {
                  const action = topActionsById.get(id);
                  if (!action) return;
                  handleActionPress(action);
                }}
              />
            </View>
          ) : null}

          <View
            style={{
              flex: 1,
              paddingHorizontal: t.spacing.md,
            }}
            onTouchStart={() => Keyboard.dismiss()}
          >
            <Slot />
          </View>

          {showComposer ? (
            <View
              pointerEvents="box-none"
              onLayout={handleComposerOverlayLayout}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9,
                elevation: 9,
                backgroundColor: t.colors.background,
              }}
            >
              {auxActions.length > 0 ? (
                <View
                  style={{
                    paddingHorizontal: t.spacing.md,
                    paddingTop: t.spacing.sm,
                    paddingBottom: t.spacing.sm,
                    gap: t.spacing.sm,
                  }}
                >
                  {auxActions.map((action) =>
                    isBlackAuxAction(action.style_code) ? (
                      <Button
                        key={action.id}
                        title={action.label}
                        onPress={() => handleActionPress(action)}
                        disabled={isExecutingAction}
                        variant="dark"
                      />
                    ) : (
                      <Pressable
                        key={action.id}
                        onPress={() => handleActionPress(action)}
                        disabled={isExecutingAction}
                        hitSlop={8}
                        style={{
                          alignSelf: "center",
                          paddingVertical: t.spacing.xs,
                          opacity: isExecutingAction ? 0.6 : 1,
                        }}
                      >
                        <Text
                          variant="body"
                          align="center"
                          style={{ color: getAuxActionTextColor(action.style_code, t) }}
                        >
                          {action.label}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              ) : null}

              <View
                style={{
                  paddingHorizontal: t.spacing.md,
                  paddingTop: auxActions.length > 0 ? 0 : t.spacing.sm,
                  paddingBottom: Math.max(insets.bottom, t.spacing.sm),
                  backgroundColor: t.colors.background,
                }}
              >
                <InputChat
                  clearOnSendStart
                  placeholder="Escribe un mensaje"
                  onSend={({ text, images }) => {
                    const outgoingMessages = buildOptimisticMessages(text, images);
                    if (outgoingMessages.length === 0) return;

                    const outgoingMessageIds = outgoingMessages.map(
                      (message) => message.id
                    );
                    setOptimisticMessages((current) => [
                      ...current,
                      ...outgoingMessages,
                    ]);

                    void (async () => {
                      try {
                        const created = await createConversationMessages({
                          conversationId,
                          text,
                          images,
                        });

                        if (!created.ok) {
                          clearOptimisticMessages(outgoingMessageIds);
                          showError(
                            "No se pudo enviar el mensaje",
                            created.error.message
                          );
                          return;
                        }

                        setOptimisticMessages((current) => [
                          ...current.filter(
                            (message) => !outgoingMessageIds.includes(message.id)
                          ),
                          ...created.data,
                        ]);
                        setMessageRefreshTick((prev) => prev + 1);
                      } catch {
                        clearOptimisticMessages(outgoingMessageIds);
                        showError(
                          "No se pudo enviar el mensaje",
                          "Ocurrió un error, intenta de nuevo."
                        );
                      }
                    })();
                  }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </ConversationLayoutContext.Provider>
  );
}
