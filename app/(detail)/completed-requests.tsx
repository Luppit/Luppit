import { Icon } from "@/src/components/Icon";
import GlassSurface from "@/src/components/glass/GlassSurface";
import LoadingState from "@/src/components/loading/LoadingState";
import MarketplaceRequestCard from "@/src/components/marketplaceHub/MarketplaceRequestCard";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import SellerOfferCard from "@/src/components/sellerOfferCard/SellerOfferCard";
import StandaloneListEmptyState from "@/src/components/standaloneList/StandaloneListEmptyState";
import { Text } from "@/src/components/Text";
import { getConversationByPurchaseOfferId } from "@/src/services/conversation.service";
import { openPopup } from "@/src/services/popup.service";
import { Roles } from "@/src/services/role.service";
import {
  getCurrentSellerPurchaseOffers,
  SellerPurchaseOfferCardData,
} from "@/src/services/purchase.offer.service";
import {
  DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE,
  getCurrentBuyerFinalizedPurchaseRequests,
  MarketplaceHubItem,
  MarketplaceHubSortConfig,
} from "@/src/services/purchase.request.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showInfo } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE = 20;
const COMPLETED_TOP_BAR_TITLE_HEIGHT = 72;
const COMPLETED_TOP_BAR_ACCESSORY_HEIGHT = 128;
const SELLER_SORT_OPTIONS = [
  { id: "newly_listed", label: "Más recientes" },
  { id: "offer_created_oldest", label: "Más antiguas" },
  { id: "price_col_low_to_high", label: "CRC: menor precio" },
  { id: "price_col_high_to_low", label: "CRC: mayor precio" },
  { id: "price_usd_low_to_high", label: "USD: menor precio" },
  { id: "price_usd_high_to_low", label: "USD: mayor precio" },
];
const DEFAULT_SELLER_SORT = SELLER_SORT_OPTIONS[0].id;

type HistoryFilters = {
  searchValue: string;
  startDate: string;
  endDate: string;
  selectedCategoryIds: string[];
  selectedCurrencyIds: string[];
};

const EMPTY_FILTERS: HistoryFilters = {
  searchValue: "",
  startDate: "",
  endDate: "",
  selectedCategoryIds: [],
  selectedCurrencyIds: [],
};

function countFilterGroups(filters: HistoryFilters) {
  return [
    filters.searchValue,
    filters.startDate || filters.endDate,
    filters.selectedCategoryIds.length > 0,
    filters.selectedCurrencyIds.length > 0,
  ].filter(Boolean).length;
}

function normalizeIds(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
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

async function openSellerConversation(offer: SellerPurchaseOfferCardData) {
  let conversationId = offer.conversation_id;

  if (!conversationId) {
    const result = await getConversationByPurchaseOfferId(offer.id);
    if (!result) {
      showInfo("Sin conversación", "Esta oferta todavía no tiene conversación.");
      return;
    }
    if (!result.ok) {
      showError("No se pudo abrir la conversación", result.error.message);
      return;
    }
    conversationId = result.data.id;
  }

  router.push({
    pathname: "/(conversation)/offer",
    params: {
      conversationId,
      title: offer.request_title ?? "Conversación",
    },
  });
}

export default function CompletedRequestsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = React.useMemo(() => createStyles(t), [t]);
  const { state, activeProfile, revision } = useActiveProfile();

  if (state === "loading") {
    return (
      <View style={s.screen}>
        <View
          style={[
            s.stateContent,
            {
              paddingTop:
                insets.top +
                t.spacing.md +
                COMPLETED_TOP_BAR_TITLE_HEIGHT +
                t.spacing.md,
            },
          ]}
        >
          <LoadingState label="Cargando historial..." />
        </View>
        <CompletedRequestsTopBar title="Solicitudes finalizadas" />
      </View>
    );
  }

  if (state !== "ready" || !activeProfile?.role) {
    return (
      <View style={s.screen}>
        <View
          style={[
            s.stateContent,
            {
              paddingTop:
                insets.top +
                t.spacing.md +
                COMPLETED_TOP_BAR_TITLE_HEIGHT +
                t.spacing.md,
            },
          ]}
        >
          <StandaloneListEmptyState
            icon="alert-circle"
            title="No pudimos cargar el historial"
            description="No encontramos un perfil activo válido. Vuelve a intentarlo desde Perfil."
          />
        </View>
        <CompletedRequestsTopBar title="Solicitudes finalizadas" />
      </View>
    );
  }

  const screenKey = `${activeProfile.profile.id}:${revision}`;
  return activeProfile.role === Roles.SELLER ? (
    <SellerCompletedRequests key={screenKey} />
  ) : (
    <BuyerCompletedRequests key={screenKey} />
  );
}

function BuyerCompletedRequests() {
  const t = useTheme();
  const s = React.useMemo(() => createStyles(t), [t]);
  const [filters, setFilters] = React.useState<HistoryFilters>(EMPTY_FILTERS);
  const [sortCode, setSortCode] = React.useState(
    DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE
  );
  const [sortConfig, setSortConfig] = React.useState<MarketplaceHubSortConfig | null>(
    null
  );
  const [items, setItems] = React.useState<MarketplaceHubItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const generationRef = React.useRef(0);
  const itemsRef = React.useRef<MarketplaceHubItem[]>([]);

  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const loadPage = React.useCallback(
    async (nextPage: number, replace: boolean) => {
      const generation = replace
        ? generationRef.current + 1
        : generationRef.current;
      if (replace) generationRef.current = generation;

      if (replace) {
        setError(null);
        setIsRefreshing(itemsRef.current.length > 0);
        setIsLoading(itemsRef.current.length === 0);
      } else {
        setIsLoadingMore(true);
      }

      const buyerFilters = {
        searchValue: filters.searchValue,
        startDate: filters.startDate,
        endDate: filters.endDate,
        selectedChipIds: [],
      };
      try {
        const pageResult = await getCurrentBuyerFinalizedPurchaseRequests(
          buyerFilters,
          sortCode,
          nextPage,
          PAGE_SIZE
        );

        if (generation !== generationRef.current) return;

        if (pageResult.ok) {
          setSortConfig(pageResult.data.sort);
          setItems((current) =>
            replace
              ? pageResult.data.items
              : Array.from(
                  new Map(
                    [...current, ...pageResult.data.items].map((item) => [
                      item.purchase_request_id,
                      item,
                    ])
                  ).values()
                )
          );
          setPage(pageResult.data.page);
          setHasMore(pageResult.data.has_more);
          setTotal(pageResult.data.total);
        } else {
          if (replace) {
            setItems([]);
            setTotal(0);
          }
          setError(pageResult.error.message);
        }
      } catch {
        if (generation !== generationRef.current) return;
        if (replace) {
          setItems([]);
          setTotal(0);
        }
        setError("Ocurrió un error inesperado al cargar el historial.");
      } finally {
        if (generation === generationRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [filters, sortCode]
  );

  useFocusEffect(
    React.useCallback(() => {
      void loadPage(1, true);
      return () => {
        generationRef.current += 1;
      };
    }, [loadPage])
  );

  const openFilters = React.useCallback(() => {
    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Buscar solicitud",
        placeholder: "Título o categoría",
        initialValue: filters.searchValue,
      },
      dateRangeField: {
        label: "Fecha de solicitud",
        startPlaceholder: "Desde",
        endPlaceholder: "Hasta",
        initialStartValue: filters.startDate,
        initialEndValue: filters.endDate,
      },
      clearLabel: "Limpiar",
      applyLabel: "Aplicar",
      onClear: () => setFilters(EMPTY_FILTERS),
      onApply: (values) =>
        setFilters({
          ...EMPTY_FILTERS,
          searchValue: values.searchValue.trim(),
          startDate: values.startDate.trim(),
          endDate: values.endDate.trim(),
        }),
    });
  }, [filters]);

  const openSort = React.useCallback(() => {
    if (!sortConfig || sortConfig.options.length === 0) return;
    openPopup({
      type: "sort",
      title: "Ordenar solicitudes",
      options: sortConfig.options.map((option) => ({
        id: option.code,
        label: option.label,
      })),
      initialSelectedId: sortCode,
      onSelect: setSortCode,
    });
  }, [sortCode, sortConfig]);

  return (
    <CompletedListLayout
      data={items}
      resultCount={total}
      keyExtractor={(item) => item.purchase_request_id}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      isLoadingMore={isLoadingMore}
      error={error}
      hasMore={hasMore}
      activeFilterCount={countFilterGroups(filters)}
      hasCustomSort={
        sortCode !==
        (sortConfig?.default_code ?? DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE)
      }
      onOpenFilters={openFilters}
      onOpenSort={openSort}
      onClear={() => {
        setFilters(EMPTY_FILTERS);
        setSortCode(
          sortConfig?.default_code ?? DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE
        );
      }}
      onRetry={() => void loadPage(1, true)}
      onRefresh={() => void loadPage(1, true)}
      onLoadMore={() => {
        if (hasMore && !isLoadingMore) void loadPage(page + 1, false);
      }}
      emptyDescription="Las compras que completes aparecerán aquí."
      renderItem={({ item }) => (
        <MarketplaceRequestCard
          item={item}
          role="buyer"
          onPress={() => openBuyerRequest(item)}
        />
      )}
      styles={s}
    />
  );
}

function SellerCompletedRequests() {
  const t = useTheme();
  const s = React.useMemo(() => createStyles(t), [t]);
  const [filters, setFilters] = React.useState<HistoryFilters>(EMPTY_FILTERS);
  const [sortCode, setSortCode] = React.useState(DEFAULT_SELLER_SORT);
  const [offers, setOffers] = React.useState<SellerPurchaseOfferCardData[]>([]);
  const [filterOptions, setFilterOptions] = React.useState<
    SellerPurchaseOfferCardData[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const generationRef = React.useRef(0);
  const offersRef = React.useRef<SellerPurchaseOfferCardData[]>([]);
  const filterOptionsRef = React.useRef<SellerPurchaseOfferCardData[]>([]);

  React.useEffect(() => {
    offersRef.current = offers;
  }, [offers]);

  React.useEffect(() => {
    filterOptionsRef.current = filterOptions;
  }, [filterOptions]);

  const load = React.useCallback(async () => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setError(null);
    setIsRefreshing(offersRef.current.length > 0);
    setIsLoading(offersRef.current.length === 0);

    const sellerFilters = {
      searchValue: filters.searchValue,
      startDate: filters.startDate,
      endDate: filters.endDate,
      selectedCategoryIds: filters.selectedCategoryIds,
      selectedCurrencyIds: filters.selectedCurrencyIds,
      selectedConversationStatusCodes: [],
    };
    try {
      const result = await getCurrentSellerPurchaseOffers(
        sellerFilters,
        sortCode,
        "history"
      );

      if (generation !== generationRef.current) return;

      if (result.ok) {
        setOffers(result.data);
        if (filterOptionsRef.current.length === 0) setFilterOptions(result.data);
      } else {
        setOffers([]);
        setError(result.error.message);
      }
    } catch {
      if (generation !== generationRef.current) return;
      setOffers([]);
      setError("Ocurrió un error inesperado al cargar el historial.");
    } finally {
      if (generation === generationRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [filters, sortCode]);

  useFocusEffect(
    React.useCallback(() => {
      void load();
      return () => {
        generationRef.current += 1;
      };
    }, [load])
  );

  const categoryOptions = React.useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    filterOptions.forEach((offer) => {
      if (offer.request_category_id && offer.request_category_name) {
        byId.set(offer.request_category_id, {
          id: offer.request_category_id,
          label: offer.request_category_name,
        });
      }
    });
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filterOptions]);

  const currencyOptions = React.useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    filterOptions.forEach((offer) => {
      if (offer.currency_id && offer.offer_currency_code) {
        byId.set(offer.currency_id, {
          id: offer.currency_id,
          label: offer.offer_currency_code,
        });
      }
    });
    return Array.from(byId.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filterOptions]);

  const openFilters = React.useCallback(() => {
    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Solicitud, comprador o descripción",
        placeholder: "Buscar finalizadas",
        initialValue: filters.searchValue,
      },
      dateRangeField: {
        label: "Fecha de oferta",
        startPlaceholder: "Desde",
        endPlaceholder: "Hasta",
        initialStartValue: filters.startDate,
        initialEndValue: filters.endDate,
      },
      chipGroups: [
        {
          id: "categories",
          label: "Categoría",
          options: categoryOptions,
          initialSelectedIds: filters.selectedCategoryIds,
        },
        {
          id: "currencies",
          label: "Moneda",
          options: currencyOptions,
          initialSelectedIds: filters.selectedCurrencyIds,
        },
      ],
      clearLabel: "Limpiar",
      applyLabel: "Aplicar",
      onClear: () => setFilters(EMPTY_FILTERS),
      onApply: (values) => {
        const selected = values.selectedChipGroupIds ?? {};
        setFilters({
          searchValue: values.searchValue.trim(),
          startDate: values.startDate.trim(),
          endDate: values.endDate.trim(),
          selectedCategoryIds: normalizeIds(selected.categories ?? []),
          selectedCurrencyIds: normalizeIds(selected.currencies ?? []),
        });
      },
    });
  }, [categoryOptions, currencyOptions, filters]);

  const openSort = React.useCallback(() => {
    openPopup({
      type: "sort",
      title: "Ordenar solicitudes",
      options: SELLER_SORT_OPTIONS,
      initialSelectedId: sortCode,
      onSelect: setSortCode,
    });
  }, [sortCode]);

  return (
    <CompletedListLayout
      data={offers}
      resultCount={offers.length}
      keyExtractor={(offer) => offer.id}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      isLoadingMore={false}
      error={error}
      hasMore={false}
      activeFilterCount={countFilterGroups(filters)}
      hasCustomSort={sortCode !== DEFAULT_SELLER_SORT}
      onOpenFilters={openFilters}
      onOpenSort={openSort}
      onClear={() => {
        setFilters(EMPTY_FILTERS);
        setSortCode(DEFAULT_SELLER_SORT);
      }}
      onRetry={() => void load()}
      onRefresh={() => void load()}
      onLoadMore={() => {}}
      emptyDescription="Las ventas que completes aparecerán aquí."
      renderItem={({ item }) => (
        <SellerOfferCard
          offer={item}
          onPress={() => void openSellerConversation(item)}
        />
      )}
      styles={s}
    />
  );
}

type CompletedListLayoutProps<T> = {
  data: T[];
  resultCount: number;
  keyExtractor: (item: T) => string;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  activeFilterCount: number;
  hasCustomSort: boolean;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  onClear: () => void;
  onRetry: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  emptyDescription: string;
  renderItem: ({ item }: { item: T }) => React.ReactElement;
  styles: ReturnType<typeof createStyles>;
};

function CompletedListLayout<T>({
  data,
  resultCount,
  keyExtractor,
  isLoading,
  isRefreshing,
  isLoadingMore,
  error,
  hasMore,
  activeFilterCount,
  hasCustomSort,
  onOpenFilters,
  onOpenSort,
  onClear,
  onRetry,
  onRefresh,
  onLoadMore,
  emptyDescription,
  renderItem,
  styles: s,
}: CompletedListLayoutProps<T>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const hasCriteria = activeFilterCount > 0 || hasCustomSort;
  const toolbar = (
    <View style={s.toolbar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          activeFilterCount > 0
            ? `Buscar y filtrar. ${activeFilterCount} filtros activos`
            : "Buscar y filtrar"
        }
        onPress={onOpenFilters}
        style={s.searchTrigger}
      >
        <Icon name="search" size={20} color={t.colors.stateAnulated} />
        <Text variant="body" color="stateAnulated" style={s.searchText}>
          {activeFilterCount > 0 ? "Filtros aplicados" : "Buscar"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ordenar solicitudes finalizadas"
        onPress={onOpenSort}
        style={s.sortButton}
      >
        <Icon name="arrow-up-down" size={24} color={t.colors.stateAnulated} />
      </Pressable>
    </View>
  );

  return (
    <View style={s.screen}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) onLoadMore();
        }}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={[
          s.listContent,
          {
            paddingTop:
              insets.top +
              t.spacing.md +
              COMPLETED_TOP_BAR_ACCESSORY_HEIGHT +
              t.spacing.md,
          },
        ]}
        ListHeaderComponent={
          <View style={s.summaryRow}>
            <Text variant="small" color="textMedium">
              {resultCount} {resultCount === 1 ? "resultado" : "resultados"}
            </Text>
            {hasCriteria ? (
              <Pressable accessibilityRole="button" onPress={onClear} hitSlop={8}>
                <Text variant="small" style={s.clearText}>
                  Limpiar todo
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            {isLoading ? (
              <LoadingState label="Cargando historial..." />
            ) : (
              <StandaloneListEmptyState
                icon={error ? "alert-circle" : hasCriteria ? "search" : "check"}
                title={
                  error
                    ? "No pudimos cargar el historial"
                    : hasCriteria
                      ? "No hay resultados"
                      : "Aún no hay solicitudes finalizadas"
                }
                description={
                  error
                    ? error
                    : hasCriteria
                      ? "Prueba cambiando la búsqueda o limpiando los filtros."
                      : emptyDescription
                }
                actionLabel={
                  error ? "Reintentar" : hasCriteria ? "Limpiar filtros" : null
                }
                actionIcon={!error && hasCriteria ? "x" : undefined}
                onAction={error ? onRetry : hasCriteria ? onClear : undefined}
              />
            )}
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={s.footer}>
              <ActivityIndicator color={t.colors.primary} />
            </View>
          ) : null
        }
      />
      <CompletedRequestsTopBar
        title="Solicitudes finalizadas"
        accessory={toolbar}
      />
    </View>
  );
}

function CompletedRequestsTopBar({
  title,
  accessory,
}: {
  title: string;
  accessory?: React.ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = React.useMemo(
    () => createCompletedTopBarStyles(t, insets.top, Boolean(accessory)),
    [accessory, insets.top, t]
  );

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }, []);

  return (
    <GlassSurface
      variant="chrome"
      blur="chrome"
      style={s.topBar}
      clipStyle={s.topBarClip}
      contentStyle={s.topBarContent}
    >
      <View style={s.topBarTitleRow}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={12}
          style={s.topBarSide}
        >
          <Icon name="arrow-left" size={28} color={t.colors.textDark} />
        </Pressable>

        <Text variant="subtitle" align="center" maxLines={1} style={s.topBarTitle}>
          {title}
        </Text>

        <View style={s.topBarSide} />
      </View>

      {accessory ? <View style={s.topBarAccessory}>{accessory}</View> : null}
    </GlassSurface>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    stateContent: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: t.spacing.md,
    },
    listContent: {
      flexGrow: 1,
      gap: t.spacing.md,
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.xl,
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    searchTrigger: {
      flex: 1,
      minHeight: 48,
      borderRadius: 999,
      ...t.glass.headerControl,
      paddingHorizontal: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    searchText: {
      flex: 1,
    },
    sortButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryRow: {
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    clearText: {
      color: t.colors.primary,
    },
    emptyState: {
      flex: 1,
      minHeight: 360,
      justifyContent: "center",
    },
    footer: {
      minHeight: 64,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}

function createCompletedTopBarStyles(
  t: Theme,
  topInset = 0,
  hasTopBarAccessory = false
) {
  const topOffset = topInset + t.spacing.md;
  const topBarHeight =
    topOffset +
    (hasTopBarAccessory
      ? COMPLETED_TOP_BAR_ACCESSORY_HEIGHT
      : COMPLETED_TOP_BAR_TITLE_HEIGHT);

  return StyleSheet.create({
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      elevation: Platform.OS === "android" ? 4 : 10,
      height: topBarHeight,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: t.glass.radius.chrome,
      borderBottomRightRadius: t.glass.radius.chrome,
    },
    topBarClip: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: t.glass.radius.chrome,
      borderBottomRightRadius: t.glass.radius.chrome,
      overflow: "hidden",
    },
    topBarContent: {
      flex: 1,
      paddingTop: topOffset,
      paddingHorizontal: t.spacing.xl,
      paddingBottom: t.spacing.md,
    },
    topBarTitleRow: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    topBarSide: {
      width: 40,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    topBarTitle: {
      flex: 1,
    },
    topBarAccessory: {
      height: 48,
      marginTop: t.spacing.sm,
    },
  });
}
