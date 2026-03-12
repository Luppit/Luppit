import ConversationActionButtons, {
  ConversationActionButtonConfig,
} from "@/src/components/conversation/ConversationActionButtons";
import { Icon } from "@/src/components/Icon";
import InputChat from "@/src/components/inputChat/inputChat";
import RoleGate from "@/src/components/role/RoleGate";
import { RoleProvider } from "@/src/components/role/RoleContext";
import { Text } from "@/src/components/Text";
import { PurchaseRequest } from "@/src/services/purchase.request.service";
import { useTheme } from "@/src/themes";
import { Redirect, Slot, router, useGlobalSearchParams } from "expo-router";
import React, { createContext, useContext, useMemo } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ConversationLayoutContextValue = {
  purchaseRequest: PurchaseRequest;
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

function parsePurchaseRequest(
  raw: string | string[] | undefined
): PurchaseRequest | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    return JSON.parse(value) as PurchaseRequest;
  } catch {
    return null;
  }
}

function parseBooleanParam(raw: string | string[] | undefined, fallback: boolean) {
  if (raw === undefined) return fallback;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseActionButtons(
  raw: string | string[] | undefined
): ConversationActionButtonConfig[] {
  if (!raw) return [];
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    const parsed = JSON.parse(value) as ConversationActionButtonConfig[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export default function ConversationLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useGlobalSearchParams<{
    purchaseRequest?: string | string[];
    showComposer?: string | string[];
    showActionButtons?: string | string[];
    actionButtons?: string | string[];
  }>();

  const purchaseRequest = useMemo(
    () => parsePurchaseRequest(params.purchaseRequest),
    [params.purchaseRequest]
  );
  const showComposer = parseBooleanParam(params.showComposer, true);
  const showActionButtons = parseBooleanParam(params.showActionButtons, false);
  const actionButtons = parseActionButtons(params.actionButtons);
  const actionButtonsOverlaySpace = showActionButtons ? 76 : 0;

  if (!purchaseRequest) return <Redirect href="/(tabs)" />;

  return (
    <ConversationLayoutContext.Provider value={{ purchaseRequest }}>
      <RoleProvider>
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
                  {purchaseRequest.title ?? "Solicitud"}
                </Text>

                <Pressable
                  onPress={() => console.log("conversation action")}
                  hitSlop={12}
                  style={{ width: 40, alignItems: "flex-end" }}
                >
                  <Icon name="ellipsis" size={28} />
                </Pressable>
              </View>
            </View>

            <RoleGate
              buyer={null}
              seller={
                showActionButtons ? (
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
                      buttons={actionButtons}
                      onPress={(id) => console.log(`conversation action button: ${id}`)}
                    />
                  </View>
                ) : null
              }
            />

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
                  onSend={({ text, images }) => {
                    console.log("conversation composer payload", { text, images });
                  }}
                />
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </RoleProvider>
    </ConversationLayoutContext.Provider>
  );
}
