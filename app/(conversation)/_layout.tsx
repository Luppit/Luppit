import ConversationActionButtons, {
  ConversationActionButtonConfig,
} from "@/src/components/conversation/ConversationActionButtons";
import { Icon } from "@/src/components/Icon";
import InputChat from "@/src/components/inputChat/inputChat";
import { Text } from "@/src/components/Text";
import Button from "@/src/components/button/Button";
import {
  ConversationView,
  ConversationViewAction,
  getCurrentUserConversationView,
} from "@/src/services/conversation.service";
import { createConversationMessages } from "@/src/services/conversation.message.service";
import { useTheme } from "@/src/themes";
import { Redirect, Slot, router, useGlobalSearchParams } from "expo-router";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lucideIcons, LucideIconName } from "@/src/icons/lucide";

type ConversationLayoutContextValue = {
  conversationId: string;
  profileId: string;
  conversationView: ConversationView;
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

function normalizeStyleFlags(styleCode: string | null) {
  const value = (styleCode ?? "").toLowerCase().trim();
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
    id: action.code || action.id,
    label: action.label || action.code || "",
    icon: normalizeIcon(action.icon),
    backgroundColorKey: isPrimary ? "primary" : "backgroudWhite",
    textColorKey: isDanger ? "error" : isPrimary ? "backgroudWhite" : "textDark",
    iconColorKey: isDanger ? "error" : isPrimary ? "backgroudWhite" : "textDark",
  };
}

function toAuxButtonVariant(styleCode: string | null): "dark" | "white" {
  const { isPrimary } = normalizeStyleFlags(styleCode);
  return isPrimary ? "dark" : "white";
}

export default function ConversationLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useGlobalSearchParams<{
    conversationId?: string | string[];
    title?: string | string[];
  }>();
  const [conversationView, setConversationView] = useState<ConversationView | null>(
    null,
  );
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageRefreshTick, setMessageRefreshTick] = useState(0);

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
  const auxActions = conversationView.actions.filter(
    (action) => (action.ui_slot ?? "").toUpperCase() === "AUX"
  );
  const showComposer = conversationView.permissions.can_send_messages;
  const showActionButtons = topActions.length > 0;
  const actionButtonsOverlaySpace = showActionButtons ? 76 + t.spacing.md : 0;
  const title = routeTitle ?? "Conversación";

  const providerValue: ConversationLayoutContextValue = {
    conversationId,
    profileId,
    conversationView,
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
                  console.log(`conversation top action: ${id}`);
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

          {auxActions.length > 0 ? (
            <ScrollView
              style={{ maxHeight: 120 }}
              contentContainerStyle={{
                paddingHorizontal: t.spacing.md,
                gap: t.spacing.sm,
                paddingBottom: t.spacing.sm,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {auxActions.map((action) => (
                <Button
                  key={action.id}
                  variant={toAuxButtonVariant(action.style_code)}
                  title={action.label}
                  onPress={() => console.log(`conversation aux action: ${action.code}`)}
                  icon={normalizeIcon(action.icon)}
                  shadow
                />
              ))}
            </ScrollView>
          ) : null}

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
