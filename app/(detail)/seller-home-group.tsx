import ProductCard from "@/src/components/productCard/ProductCard";
import { Text } from "@/src/components/Text";
import {
  getCurrentSellerHomePurchaseRequestGroups,
  PurchaseRequest,
  SellerHomePurchaseRequestItem,
} from "@/src/services/purchase.request.service";
import { useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

function parseStringParam(raw: string | string[] | undefined): string {
  if (!raw) return "";
  return Array.isArray(raw) ? raw[0] ?? "" : raw;
}

function formatPublishedLabel(rawDate: string | null): string {
  if (!rawDate) return "Ahora";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "Ahora";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin <= 1) return "Justo ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} d`;
  return date.toLocaleDateString("es-CR");
}

function toPurchaseRequest(item: SellerHomePurchaseRequestItem): PurchaseRequest {
  const timestamp = item.published_at ?? item.created_at;
  return {
    id: item.id,
    profile_id: "",
    draft_id: null,
    category_id: item.category_id,
    category_path: item.category_path,
    category_name: item.category_name,
    title: item.title,
    summary_text: item.summary_text,
    contract: {},
    status: item.status,
    created_at: item.created_at,
    published_at: timestamp,
    updated_at: timestamp,
  };
}

export default function SellerHomeGroupScreen() {
  const t = useTheme();
  const params = useGlobalSearchParams<{
    groupCode?: string | string[];
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<SellerHomePurchaseRequestItem[]>([]);
  const groupCode = useMemo(() => parseStringParam(params.groupCode), [params.groupCode]);

  const loadGroup = useCallback(async () => {
    if (!groupCode) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await getCurrentSellerHomePurchaseRequestGroups();
    if (!result.ok) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const group = result.data.find((value) => value.code === groupCode);
    setItems(group?.items ?? []);
    setIsLoading(false);
  }, [groupCode]);

  useFocusEffect(
    useCallback(() => {
      void loadGroup();
      return () => {};
    }, [loadGroup])
  );

  if (isLoading) {
    return <Text>Cargando solicitudes...</Text>;
  }

  if (items.length === 0) {
    return <Text color="stateAnulated">No hay solicitudes para mostrar.</Text>;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: t.spacing.md,
        paddingVertical: t.spacing.md,
        paddingBottom: t.spacing.xl,
      }}
    >
      {items.map((item) => (
        <View key={item.id}>
          <ProductCard
            title={item.title ?? "Solicitud"}
            subtitle={item.category_name ?? "-"}
            views={item.views_count}
            statusLabel="Activa"
            offersLabel={formatPublishedLabel(item.published_at ?? item.created_at)}
            onPress={() =>
              router.push({
                pathname: "/(detail)/purchase-request",
                params: {
                  title: item.title ?? "Detalle de solicitud",
                  purchaseRequest: JSON.stringify(toPurchaseRequest(item)),
                },
              })
            }
          />
        </View>
      ))}
    </ScrollView>
  );
}
