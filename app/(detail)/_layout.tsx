import DetailTopBar from "./detail-top-bar";
import { useTheme } from "@/src/themes";
import { Slot, useGlobalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DetailLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useGlobalSearchParams<{
    title?: string | string[];
    hideMenu?: string | string[];
  }>();
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const hideMenuParam = Array.isArray(params.hideMenu) ? params.hideMenu[0] : params.hideMenu;
  const hideMenu = hideMenuParam === "true";

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: t.spacing.md }}>
        <DetailTopBar title={title} hideMenu={hideMenu} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: t.spacing.md }}>
        <Slot />
      </View>
    </View>
  );
}
