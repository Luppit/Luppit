import ModalTopBar from "./modal-top-bar";
import { useTheme } from "@/src/themes";
import { Slot, useGlobalSearchParams, usePathname } from "expo-router";
import React from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ModalLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useGlobalSearchParams<{ title?: string | string[] }>();
  const pathname = usePathname();
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const isOfferModal = pathname.includes("/offer");

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      {isOfferModal ? (
        <ModalTopBar
          title={title}
          glass
          topInset={insets.top}
        />
      ) : (
        <View
          style={{
            paddingTop: insets.top,
            paddingHorizontal: t.spacing.md,
            backgroundColor: t.colors.background,
          }}
        >
          <ModalTopBar title={title} />
        </View>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: t.spacing.md,
            backgroundColor: isOfferModal ? "transparent" : t.colors.background,
          }}
        >
          <Slot />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
