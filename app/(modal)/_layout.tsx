import ModalTopBar from "./modal-top-bar";
import { useTheme } from "@/src/themes";
import { Slot, useGlobalSearchParams } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ModalLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useGlobalSearchParams<{ title?: string | string[] }>();
  const title = Array.isArray(params.title) ? params.title[0] : params.title;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
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
        <ModalTopBar title={title} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1, paddingHorizontal: t.spacing.md }}>
          <Slot />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
