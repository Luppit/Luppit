import ProductCard from "@/src/components/productCard/ProductCard";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import { getOrCreateCurrentSellerConversationByPurchaseRequestId } from "@/src/services/conversation.service";
import {
  getCurrentSellerHomePurchaseRequestGroups,
  SellerHomePurchaseRequestItem,
} from "@/src/services/purchase.request.service";
import { registerPurchaseRequestVisualization } from "@/src/services/purchase.request.visualization.service";
import { useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
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

export default function SellerHomeGroupScreen() {
  const t = useTheme();
  const params = useGlobalSearchParams<{
    groupCode?: string | string[];
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<SellerHomePurchaseRequestItem[]>([]);
  const groupCode = useMemo(() => parseStringParam(params.groupCode), [params.groupCode]);
  const openRequestConversation = useCallback(async (item: SellerHomePurchaseRequestItem) => {
    await registerPurchaseRequestVisualization(item.id);
    const conversation = await getOrCreateCurrentSellerConversationByPurchaseRequestId(item.id);

    if (!conversation?.ok) {
      const message = conversation?.error.message ?? "Ocurrió un error, intenta de nuevo.";
      showError("No se pudo abrir la conversación", message);
      return;
    }

    router.push({
      pathname: "/(conversation)/offer",
      params: {
        conversationId: conversation.data.id,
        title: item.title ?? "Conversación",
      },
    });
  }, []);

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
    return <LoadingState label="Cargando solicitudes..." />;
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
            statusLabel={item.status_label ?? item.status}
            offersLabel={formatPublishedLabel(item.published_at ?? item.created_at)}
            onPress={() => void openRequestConversation(item)}
          />
        </View>
      ))}
    </ScrollView>
  );
}
