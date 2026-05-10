import { useFocusEffect } from "@react-navigation/native";
import ConversationActionButtons, {
  ConversationActionButtonConfig,
} from "@/src/components/conversation/ConversationActionButtons";
import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import InputChat from "@/src/components/inputChat/inputChat";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import { lucideIcons, LucideIconName } from "@/src/icons/lucide";
import { getSession } from "@/src/lib/supabase";
import { supabase } from "@/src/lib/supabase/client";
import { openPopup, PopupOption } from "@/src/services/popup.service";
import {
  ConversationMessage,
  createConversationMessages,
} from "@/src/services/conversation.message.service";
import {
  ConversationView,
  ConversationViewAction,
  executeConversationAction,
  executeConversationActionByExecutor,
  getCurrentUserConversationView,
} from "@/src/services/conversation.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showInfo, showSuccess } from "@/src/utils/useToast";
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
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    backgroundColorKey: "backgroudWhite",
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
  const [messageRefreshTick, setMessageRefreshTick] = useState(0);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ConversationMessage[]>(
    []
  );
  const realtimeRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const realtimeRefreshTargetsRef = useRef<Set<ConversationRealtimeRefreshTarget>>(
    new Set()
  );

  const conversationId = useMemo(
    () => parseStringParam(params.conversationId),
    [params.conversationId]
  );
  const routeTitle = useMemo(() => parseStringParam(params.title), [params.title]);
  const purchaseRequestId = conversationView?.conversation.purchase_request_id ?? null;

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
      setConversationView(null);
      setProfileId(null);
      setIsLoading(false);
      return;
    }

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
      payload?: Record<string, unknown> | null
    ) => {
      if (!conversationId || !profileId) return;
      if (!action.code) {
        showError("Acción no disponible", "Esta acción no tiene código de ejecución.");
        return;
      }
      if (isExecutingAction) return;

      setIsExecutingAction(true);

      let result:
        | { ok: true; data: unknown }
        | { ok: false; error: { message: string } };

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
            setIsExecutingAction(false);
            return;
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
          if (!conversationId) {
            showError(
              "No se pudo abrir la edición",
              "La conversación no está disponible."
            );
            setIsExecutingAction(false);
            return;
          }

          router.push({
            pathname: "/(modal)/offer",
            params: {
              title: "Modificar oferta",
              conversationId,
              mode: "edit",
              ...(purchaseRequestId ? { purchaseRequestId } : null),
            },
          });
        } else if (action.executor.target !== "popup.close") {
          showInfo("Acción local", `Comando cliente: ${action.executor.target}`);
        }
        result = { ok: true, data: null };
      } else {
        result = await executeConversationAction({
          conversationId,
          profileId,
          actionCode: action.code,
          payload: payload ?? null,
        });
      }

      setIsExecutingAction(false);

      if (!result.ok) {
        showError("No se pudo ejecutar la acción", result.error.message);
        return;
      }

      const shouldRefresh = action.executor?.requires_refresh ?? true;
      if (shouldRefresh) {
        await refreshConversation();
        setMessageRefreshTick((prev) => prev + 1);
      }

      if (action.executor?.execution_type !== "client_command") {
        showSuccess("Acción completada");
      }
    },
    [
      conversationId,
      profileId,
      isExecutingAction,
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

      const inputValues: Record<string, unknown> = {};
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
        is_required: input.is_required,
        onValueChange: (value: unknown) => {
          inputValues[input.payload_key] = value;
        },
      }));
      const ratingInputTitle =
        confirmation.inputs.find((input) => input.kind === "rating")?.label ?? null;
      const confirmStyle = normalizeStyleFlags(confirmation.confirm_style_code);

      openPopup({
        type: "summary",
        title: ratingInputTitle || confirmation.title,
        description,
        rows,
        inputs,
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
            onPress: () => {
              const invalidInput = confirmation.inputs.find((input) => {
                const raw = inputValues[input.payload_key];

                if (input.kind === "otp") {
                  const value = typeof raw === "string" ? raw.trim() : "";
                  if (input.is_required && !value) return true;
                  if (value && value.length !== input.otp_length) return true;
                  return false;
                }

                if (input.kind === "rating") {
                  if (!input.is_required) return false;
                  if (!isRatingPayload(raw)) return true;
                  return raw.stars < 1;
                }

                const value = typeof raw === "string" ? raw.trim() : "";
                if (input.is_required && !value) return true;
                return false;
              });

              if (invalidInput) {
                const message =
                  invalidInput.kind === "otp"
                    ? `Ingresa un código de ${invalidInput.otp_length} dígitos.`
                    : invalidInput.kind === "rating"
                      ? "Selecciona una calificación en estrellas."
                    : `${invalidInput.label} es obligatorio.`;
                showError("Dato inválido", message);
                return;
              }

              const payload =
                confirmation.inputs.length > 0
                  ? confirmation.inputs.reduce<Record<string, unknown>>((acc, input) => {
                      const raw = inputValues[input.payload_key];

                      if (input.kind === "rating") {
                        if (isRatingPayload(raw) && raw.stars >= 1) {
                          acc[input.payload_key] = raw;
                        }
                        return acc;
                      }

                      const value = typeof raw === "string" ? raw.trim() : "";
                      if (value) {
                        acc[input.payload_key] = value;
                      }
                      return acc;
                    }, {})
                  : null;

              void runAction(action, payload);
            },
          },
        ],
      });
    },
    [conversationView?.context, runAction]
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

  if (!conversationId) return <Redirect href="/(tabs)" />;

  if (isLoading || !conversationView || !profileId) {
    return <LoadingState label="Cargando conversación..." />;
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
  const showComposer = conversationView.permissions.can_send_messages;
  const showActionButtons = topActions.length > 0;
  const headerBarHeight = 56;
  const actionButtonsOverlaySpace = showActionButtons ? 64 + t.spacing.md : 0;
  const title = routeTitle ?? "Conversación";

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
  };

  return (
    <ConversationLayoutContext.Provider value={providerValue}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: t.colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingTop: insets.top,
              paddingHorizontal: t.spacing.md,
              backgroundColor: t.colors.background,
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
                style={{ width: 40, alignItems: "flex-start" }}
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
                    opacity: isExecutingAction ? 0.6 : 1,
                  }}
                >
                  <Icon name="ellipsis" size={28} />
                </Pressable>
              ) : (
                <View style={{ width: 40 }} />
              )}
            </View>
          </View>

          {showActionButtons ? (
            <View
              style={{
                position: "absolute",
                top: insets.top + headerBarHeight - t.spacing.xs,
                left: 0,
                right: 0,
                zIndex: 10,
                elevation: 10,
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
              paddingTop: actionButtonsOverlaySpace,
            }}
            onTouchStart={() => Keyboard.dismiss()}
          >
            <Slot />
          </View>

          {showComposer ? (
            <>
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
                }}
              >
                <InputChat
                  clearOnSendStart
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
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </ConversationLayoutContext.Provider>
  );
}
