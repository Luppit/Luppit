import DetailTopBar from "./detail-top-bar";
import { useTheme } from "@/src/themes";
import { Slot, useGlobalSearchParams, usePathname } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const unstable_settings = {
  initialRouteName: "fallback",
};

const DEFAULT_DETAIL_TITLES: Record<string, string> = {
  "/account-settings": "Configuración",
  "/business-categories": "Categorías de venta",
  "/business-invitation-new": "Nueva invitación",
  "/business-invitations": "Equipo",
  "/business-profile": "Negocio",
  "/buyer-home-group": "Tus solicitudes",
  "/category-info": "Información de categoría",
  "/create-profile": "Crear perfil",
  "/faq": "Ayuda",
  "/home-preset": "Configurar inicio",
  "/legal-document": "Documento legal",
  "/marketplace-hub-section": "Marketplace",
  "/notifications": "Notificaciones",
  "/purchase-request": "Detalle de solicitud",
  "/seller-business": "Negocio",
  "/seller-home-group": "Para ti",
};

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

function getPurchaseRequestStatus(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const status = (parsed as { status?: unknown }).status;
    return typeof status === "string" && status ? status : null;
  } catch {
    return null;
  }
}

export default function DetailLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{
    title?: string | string[];
    hideMenu?: string | string[];
    purchaseRequest?: string | string[];
    role?: string | string[];
  }>();
  const titleParam = Array.isArray(params.title) ? params.title[0] : params.title;
  const title = titleParam?.trim() || DEFAULT_DETAIL_TITLES[pathname];
  const hideMenuParam = Array.isArray(params.hideMenu) ? params.hideMenu[0] : params.hideMenu;
  const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
  const purchaseRequestId = getPurchaseRequestId(params.purchaseRequest);
  const purchaseRequestStatus = getPurchaseRequestStatus(params.purchaseRequest);
  const hideMenu =
    hideMenuParam === "true" || pathname !== "/purchase-request" || !purchaseRequestId;
  const marketplaceSectionOwnsTopBar =
    pathname === "/marketplace-hub-section" && roleParam === "seller";

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: t.spacing.md }}>
        <Slot />
      </View>
      {marketplaceSectionOwnsTopBar ? null : (
        <DetailTopBar
          title={title}
          hideMenu={hideMenu}
          purchaseRequestId={purchaseRequestId}
          purchaseRequestStatus={purchaseRequestStatus}
          topInset={insets.top}
        />
      )}
    </View>
  );
}
