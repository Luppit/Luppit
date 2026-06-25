import LoadingState from "@/src/components/loading/LoadingState";
import MarketplaceRequestCard from "@/src/components/marketplaceHub/MarketplaceRequestCard";
import { openPurchaseRequestCardMenu } from "@/src/components/marketplaceHub/openPurchaseRequestCardMenu";
import usePurchaseRequestFavorites from "@/src/components/marketplaceHub/usePurchaseRequestFavorites";
import { Text } from "@/src/components/Text";
import {
  BuyerHomeFilters,
  EMPTY_BUYER_HOME_FILTERS,
} from "@/src/services/buyer.home.filters.service";
import { getOrCreateCurrentSellerConversationByPurchaseRequestId } from "@/src/services/conversation.service";
import {
  getCurrentBuyerMarketplaceHubItems,
  getCurrentSellerMarketplaceHubItems,
  MarketplaceHubItem,
  MarketplaceHubRole,
} from "@/src/services/purchase.request.service";
import {
  EMPTY_SELLER_HOME_FILTERS,
  SellerHomeFilters,
} from "@/src/services/seller.home.filters.service";
import { useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

const PAGE_SIZE = 20;

function parseStringParam(raw: string | string[] | undefined): string {
  if (!raw) return "";
  return Array.isArray(raw) ? raw[0] ?? "" : raw;
}

function parseRole(raw: string): MarketplaceHubRole {
  return raw === "seller" ? "seller" : "buyer";
}

function parseFilters(
  role: MarketplaceHubRole,
  raw: string
): BuyerHomeFilters | SellerHomeFilters {
  if (!raw) {
    return role === "buyer" ? EMPTY_BUYER_HOME_FILTERS : EMPTY_SELLER_HOME_FILTERS;
  }

  try {
    const parsed = JSON.parse(raw) as BuyerHomeFilters | SellerHomeFilters;
    return parsed;
  } catch {
    return role === "buyer" ? EMPTY_BUYER_HOME_FILTERS : EMPTY_SELLER_HOME_FILTERS;
  }
}

function toPurchaseRequestParam(item: MarketplaceHubItem) {
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

function openBuyerRequest(item: MarketplaceHubItem) {
  router.push({
    pathname: "/(detail)/purchase-request",
    params: {
      title: item.title ?? "Detalle de solicitud",
      purchaseRequest: JSON.stringify(toPurchaseRequestParam(item)),
    },
  });
}

async function openSellerRequest(item: MarketplaceHubItem) {
  if (item.navigation?.target === "conversation" && item.navigation.conversation_id) {
    router.push({
      pathname: "/(conversation)/offer",
      params: {
        conversationId: item.navigation.conversation_id,
        title: item.title ?? "Conversación",
      },
    });
    return;
  }

  const conversation = await getOrCreateCurrentSellerConversationByPurchaseRequestId(item.id);
  if (!conversation?.ok) {
    showError(
      "No se pudo abrir la conversación",
      conversation?.error.message ?? "Ocurrió un error, intenta de nuevo."
    );
    return;
  }

  router.push({
    pathname: "/(conversation)/offer",
    params: {
      conversationId: conversation.data.id,
      title: item.title ?? "Conversación",
    },
  });
}

export default function MarketplaceHubSectionScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const params = useGlobalSearchParams<{
    role?: string | string[];
    stageCode?: string | string[];
    segmentSvgName?: string | string[];
    title?: string | string[];
    description?: string | string[];
    filters?: string | string[];
  }>();
  const role = useMemo(() => parseRole(parseStringParam(params.role)), [params.role]);
  const stageCode = useMemo(() => parseStringParam(params.stageCode), [params.stageCode]);
  const segmentSvgName = useMemo(
    () => parseStringParam(params.segmentSvgName),
    [params.segmentSvgName]
  );
  const description = useMemo(
    () => parseStringParam(params.description),
    [params.description]
  );
  const filters = useMemo(
    () => parseFilters(role, parseStringParam(params.filters)),
    [params.filters, role]
  );
  const [items, setItems] = useState<MarketplaceHubItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { favoriteIds, toggle: toggleFavorite } = usePurchaseRequestFavorites(role);

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (!stageCode) {
        setItems([]);
        setTotal(0);
        setHasMore(false);
        setIsLoading(false);
        return;
      }

      if (replace) setIsLoading(true);
      else setIsLoadingMore(true);

      const result =
        role === "buyer"
          ? await getCurrentBuyerMarketplaceHubItems(
              filters as BuyerHomeFilters,
              segmentSvgName,
              stageCode,
              nextPage,
              PAGE_SIZE
            )
          : await getCurrentSellerMarketplaceHubItems(
              filters as SellerHomeFilters,
              segmentSvgName,
              stageCode,
              nextPage,
              PAGE_SIZE
            );

      if (result.ok) {
        setItems((current) => (replace ? result.data.items : [...current, ...result.data.items]));
        setTotal(result.data.total);
        setPage(result.data.page);
        setHasMore(result.data.has_more);
      } else if (replace) {
        setItems([]);
        setTotal(0);
        setHasMore(false);
      }

      setIsLoading(false);
      setIsLoadingMore(false);
    },
    [filters, role, segmentSvgName, stageCode]
  );

  useFocusEffect(
    useCallback(() => {
      void loadPage(1, true);
      return () => {};
    }, [loadPage])
  );

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    void loadPage(page + 1, false);
  }, [hasMore, isLoading, isLoadingMore, loadPage, page]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, paddingTop: topContentInset }}>
        <LoadingState label="Cargando solicitudes..." />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.purchase_request_id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: t.spacing.md,
        paddingTop: topContentInset + t.spacing.lg,
        paddingBottom: t.spacing.xl,
      }}
      ListHeaderComponent={
        description || total > 0 ? (
          <View style={{ gap: t.spacing.xs, paddingBottom: t.spacing.sm }}>
            {description ? (
              <Text variant="body" color="stateAnulated">
                {description}
              </Text>
            ) : null}
            <Text variant="body" color="stateAnulated">
              {total} {total === 1 ? "solicitud" : "solicitudes"}
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={{ paddingVertical: t.spacing.xl }}>
          <Text align="center" color="stateAnulated">
            No hay solicitudes para mostrar.
          </Text>
        </View>
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ paddingVertical: t.spacing.md }}>
            <ActivityIndicator color={t.colors.primary} />
          </View>
        ) : null
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      renderItem={({ item }) => (
        <MarketplaceRequestCard
          item={item}
          onPress={() => (role === "buyer" ? openBuyerRequest(item) : void openSellerRequest(item))}
          onLongPress={() =>
            openPurchaseRequestCardMenu({
              item,
              role,
              isFavorite: favoriteIds.has(item.id),
              onToggleFavorite: () => void toggleFavorite(item.id),
            })
          }
        />
      )}
    />
  );
}
