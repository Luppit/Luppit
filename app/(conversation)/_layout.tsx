import { useFocusEffect } from "@react-navigation/native";
import ConversationActionButtons, {
  ConversationActionButtonConfig,
} from "@/src/components/conversation/ConversationActionButtons";
import { Icon } from "@/src/components/Icon";
import InputChat from "@/src/components/inputChat/inputChat";
import { Text } from "@/src/components/Text";
import { lucideIcons, LucideIconName } from "@/src/icons/lucide";
import { openPopup } from "@/src/services/popup.service";
import { createConversationMessages } from "@/src/services/conversation.message.service";
import {
  ConversationView,
  ConversationViewAction,
  executeConversationAction,
  executeConversationActionByExecutor,
  getCurrentUserConversationView,
} from "@/src/services/conversation.service";
import { useTheme } from "@/src/themes";
import { showError, showInfo, showSuccess } from "@/src/utils/useToast";
import { Redirect, Slot, router, useGlobalSearchParams } from "expo-router";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
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
  onActionPress: (action: ConversationViewAction) => void;
  isExecutingAction: boolean;
  refreshConversation: () => Promise<void>;
  messageRefreshTick: number;
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

function isRatingPayload(value: unknown): value is RatingPayload {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Record<string, unknown>;
  return (
    typeof parsed.stars === "number" &&
    Array.isArray(parsed.tags) &&
    typeof parsed.comment === "string"
  );
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

  const conversationId = useMemo(
    () => parseStringParam(params.conversationId),
    [params.conversationId]
  );
  const routeTitle = useMemo(() => parseStringParam(params.title), [params.title]);

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
        if (action.executor.target !== "popup.close") {
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
    [conversationId, profileId, isExecutingAction, refreshConversation]
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
      const confirmStyle = normalizeStyleFlags(confirmation.confirm_style_code);

      openPopup({
        type: "summary",
        title: confirmation.title,
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

  if (!conversationId) return <Redirect href="/(tabs)" />;

  if (isLoading || !conversationView || !profileId) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: t.colors.background,
        }}
      >
        <Text>Cargando conversación...</Text>
      </View>
    );
  }

  const topActions = conversationView.actions
    .filter((action) => (action.ui_slot ?? "").toUpperCase() === "TOP")
    .map(toTopButtonConfig);
  const topActionsById = new Map(
    conversationView.actions
      .filter((action) => (action.ui_slot ?? "").toUpperCase() === "TOP")
      .map((action) => [action.id, action] as const)
  );
  const auxActions = conversationView.actions.filter(
    (action) => (action.ui_slot ?? "").toUpperCase() === "AUX"
  );
  const hasAuxActions = auxActions.length > 0;
  const showComposer = conversationView.permissions.can_send_messages && !hasAuxActions;
  const showActionButtons = topActions.length > 0;
  const actionButtonsOverlaySpace = showActionButtons ? 76 + t.spacing.md : 0;
  const title = routeTitle ?? "Conversación";

  const providerValue: ConversationLayoutContextValue = {
    conversationId,
    profileId,
    conversationView,
    auxActions,
    onActionPress: handleActionPress,
    isExecutingAction,
    refreshConversation,
    messageRefreshTick,
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
              paddingBottom: t.spacing.sm,
              backgroundColor: t.colors.backgroudWhite,
              shadowColor: t.colors.shadow,
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 3 },
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View
              style={{
                height: 68,
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

              <View style={{ width: 40 }} />
            </View>
          </View>

          {showActionButtons ? (
            <View
              style={{
                position: "absolute",
                top: insets.top + 68 + 2,
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
            <View
              style={{
                paddingHorizontal: t.spacing.md,
                paddingTop: t.spacing.sm,
                paddingBottom: Math.max(insets.bottom, t.spacing.sm),
              }}
            >
              <InputChat
                onSend={async ({ text, images }) => {
                  const created = await createConversationMessages({
                    conversationId,
                    text,
                    images,
                  });
                  if (created.ok) {
                    setMessageRefreshTick((prev) => prev + 1);
                  }
                }}
              />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </ConversationLayoutContext.Provider>
  );
}
