import DetailTopBar from "./detail-top-bar";
import { useTheme } from "@/src/themes";
import { Slot, useGlobalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getPurchaseRequestId(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const id = (parsed as { id?: unknown }).id;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}

export default function DetailLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useGlobalSearchParams<{
    title?: string | string[];
    hideMenu?: string | string[];
    purchaseRequest?: string | string[];
  }>();
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const hideMenuParam = Array.isArray(params.hideMenu) ? params.hideMenu[0] : params.hideMenu;
  const hideMenu = hideMenuParam === "true";
  const purchaseRequestId = getPurchaseRequestId(params.purchaseRequest);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: t.spacing.md }}>
        <DetailTopBar
          title={title}
          hideMenu={hideMenu}
          purchaseRequestId={purchaseRequestId}
        />
      </View>
      <View style={{ flex: 1, paddingHorizontal: t.spacing.md }}>
        <Slot />
      </View>
    </View>
  );
}
