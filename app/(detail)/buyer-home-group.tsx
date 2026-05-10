import ProductCard from "@/src/components/productCard/ProductCard";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import { getPurchaseOffersCountByPurchaseRequestIds } from "@/src/services/purchase.offer.service";
import {
  BuyerHomePurchaseRequestItem,
  getCurrentBuyerHomePurchaseRequestGroups,
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

function toPurchaseRequestParam(item: BuyerHomePurchaseRequestItem) {
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
    published_at: item.published_at ?? item.created_at,
    updated_at: item.created_at,
  };
}

export default function BuyerHomeGroupScreen() {
  const t = useTheme();
  const params = useGlobalSearchParams<{
    groupCode?: string | string[];
    segmentSvgName?: string | string[];
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<BuyerHomePurchaseRequestItem[]>([]);
  const [offerCountsByRequestId, setOfferCountsByRequestId] = useState<Record<string, number>>({});
  const groupCode = useMemo(() => parseStringParam(params.groupCode), [params.groupCode]);
  const segmentSvgName = useMemo(
    () => parseStringParam(params.segmentSvgName),
    [params.segmentSvgName]
  );

  const loadGroup = useCallback(async () => {
    if (!groupCode) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await getCurrentBuyerHomePurchaseRequestGroups(undefined, segmentSvgName);
    if (!result.ok) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const group = result.data.find((value) => value.code === groupCode);
    const nextItems = group?.items ?? [];
    setItems(nextItems);

    const countsResult = await getPurchaseOffersCountByPurchaseRequestIds(
      nextItems.map((item) => item.id)
    );
    setOfferCountsByRequestId(countsResult.ok ? countsResult.data : {});
    setIsLoading(false);
  }, [groupCode, segmentSvgName]);

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
            offersLabel={`${offerCountsByRequestId[item.id] ?? 0} ofertas`}
            onPress={() =>
              router.push({
                pathname: "/(detail)/purchase-request",
                params: {
                  title: item.title ?? "Detalle de solicitud",
                  purchaseRequest: JSON.stringify(toPurchaseRequestParam(item)),
                },
              })
            }
          />
        </View>
      ))}
    </ScrollView>
  );
}
