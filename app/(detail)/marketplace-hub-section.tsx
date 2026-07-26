import LuppitChip from "@/src/components/chip/LuppitChip";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import MarketplaceRequestCard from "@/src/components/marketplaceHub/MarketplaceRequestCard";
import { openPurchaseRequestCardMenu } from "@/src/components/marketplaceHub/openPurchaseRequestCardMenu";
import usePurchaseRequestFavorites from "@/src/components/marketplaceHub/usePurchaseRequestFavorites";
import StandaloneListEmptyState from "@/src/components/standaloneList/StandaloneListEmptyState";
import { Text } from "@/src/components/Text";
import {
  BuyerHomeFilters,
  EMPTY_BUYER_HOME_FILTERS,
} from "@/src/services/buyer.home.filters.service";
import { getOrCreateCurrentSellerConversationByPurchaseRequestId } from "@/src/services/conversation.service";
import { openPopup } from "@/src/services/popup.service";
import {
  DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE,
  DEFAULT_SELLER_MARKETPLACE_HUB_SORT_CODE,
  getCurrentBuyerMarketplaceHubItems,
  getCurrentSellerHomeFilterCategoryOptions,
  getCurrentSellerMarketplaceHubItems,
  MarketplaceHubItem,
  MarketplaceHubRole,
  MarketplaceHubSortConfig,
  SellerHomeFilterCategoryOption,
} from "@/src/services/purchase.request.service";
import {
  EMPTY_SELLER_HOME_FILTERS,
  SellerHomeFilters,
  SellerHomeInteractionState,
} from "@/src/services/seller.home.filters.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router, useGlobalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  findNodeHandle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

const PAGE_SIZE = 20;
const SELLER_TOP_BAR_VISIBLE_HEIGHT = 128;
const SELLER_SORT_ROLLOUT_FALLBACK: MarketplaceHubSortConfig = {
  default_code: DEFAULT_SELLER_MARKETPLACE_HUB_SORT_CODE,
  selected_code: DEFAULT_SELLER_MARKETPLACE_HUB_SORT_CODE,
  options: [
    { code: "recommended", label: "Recomendadas", sort_order: 10 },
    { code: "request_newest", label: "Más recientes", sort_order: 20 },
    { code: "fewest_offers", label: "Menos competencia", sort_order: 30 },
  ],
};
const SELLER_INTERACTION_OPTIONS: {
  id: SellerHomeInteractionState;
  label: string;
}[] = [
  { id: "new", label: "Sin abrir" },
  { id: "opened", label: "En gestión" },
];

type CriteriaChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

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
    return JSON.parse(raw) as BuyerHomeFilters | SellerHomeFilters;
  } catch {
    return role === "buyer" ? EMPTY_BUYER_HOME_FILTERS : EMPTY_SELLER_HOME_FILTERS;
  }
}

function normalizeSellerListingFilters(filters: SellerHomeFilters): SellerHomeFilters {
  const validInteractionStates = new Set<SellerHomeInteractionState>([
    "new",
    "opened",
  ]);

  return {
    searchValue: filters.searchValue?.trim() ?? "",
    startDate: filters.startDate?.trim() ?? "",
    endDate: filters.endDate?.trim() ?? "",
    selectedCategoryIds: Array.from(
      new Set((filters.selectedCategoryIds ?? []).map((id) => id.trim()).filter(Boolean))
    ),
    selectedInteractionStates: Array.from(
      new Set(
        (filters.selectedInteractionStates ?? []).filter((state) =>
          validInteractionStates.has(state)
        )
      )
    ),
  };
}

function hasSellerListingFilters(filters: SellerHomeFilters) {
  return Boolean(
    filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedCategoryIds.length > 0 ||
      filters.selectedInteractionStates.length > 0
  );
}

function countSellerFilterGroups(filters: SellerHomeFilters) {
  return [
    filters.searchValue,
    filters.startDate || filters.endDate,
    filters.selectedCategoryIds.length > 0,
    filters.selectedInteractionStates.length > 0,
  ].filter(Boolean).length;
}

function deduplicateItems(items: MarketplaceHubItem[]) {
  const byId = new Map<string, MarketplaceHubItem>();
  items.forEach((item) => byId.set(item.purchase_request_id, item));
  return Array.from(byId.values());
}

function restoreAccessibilityFocus(target: React.RefObject<View | null>) {
  setTimeout(() => {
    const targetHandle = findNodeHandle(target.current);
    if (targetHandle) AccessibilityInfo.setAccessibilityFocus(targetHandle);
  }, 320);
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

  const conversation =
    await getOrCreateCurrentSellerConversationByPurchaseRequestId(item.id);
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
  const s = useMemo(() => createStyles(t, insets.top), [insets.top, t]);
  const params = useGlobalSearchParams<{
    role?: string | string[];
    stageCode?: string | string[];
    segmentSvgName?: string | string[];
    title?: string | string[];
    description?: string | string[];
    filters?: string | string[];
    sortCode?: string | string[];
  }>();
  const role = useMemo(() => parseRole(parseStringParam(params.role)), [params.role]);
  const isSeller = role === "seller";
  const topContentInset =
    insets.top +
    (isSeller
      ? SELLER_TOP_BAR_VISIBLE_HEIGHT
      : DETAIL_TOP_BAR_VISIBLE_HEIGHT);
  const title = useMemo(
    () => parseStringParam(params.title) || "Oportunidades para ti",
    [params.title]
  );
  const stageCode = useMemo(
    () => parseStringParam(params.stageCode),
    [params.stageCode]
  );
  const segmentSvgName = useMemo(
    () => parseStringParam(params.segmentSvgName),
    [params.segmentSvgName]
  );
  const description = useMemo(
    () => parseStringParam(params.description),
    [params.description]
  );
  const buyerSortCode = useMemo(
    () =>
      parseStringParam(params.sortCode) ||
      DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE,
    [params.sortCode]
  );
  const routeFilters = useMemo(
    () => parseFilters(role, parseStringParam(params.filters)),
    [params.filters, role]
  );
  const initialSellerFilters = useMemo(
    () =>
      normalizeSellerListingFilters(
        routeFilters as SellerHomeFilters
      ),
    [routeFilters]
  );
  const [sellerFilters, setSellerFilters] =
    useState<SellerHomeFilters>(initialSellerFilters);
  const [sellerSortCode, setSellerSortCode] = useState(
    DEFAULT_SELLER_MARKETPLACE_HUB_SORT_CODE
  );
  const [sellerSortConfig, setSellerSortConfig] =
    useState<MarketplaceHubSortConfig | null>(null);
  const sellerSortPresentation = useMemo<MarketplaceHubSortConfig>(
    () =>
      sellerSortConfig ?? {
        ...SELLER_SORT_ROLLOUT_FALLBACK,
        selected_code: sellerSortCode,
      },
    [sellerSortCode, sellerSortConfig]
  );
  const [sellerCategoryOptions, setSellerCategoryOptions] = useState<
    SellerHomeFilterCategoryOption[]
  >([]);
  const effectiveFilters = isSeller ? sellerFilters : routeFilters;
  const effectiveSortCode = isSeller ? sellerSortCode : buyerSortCode;
  const criteriaKey = useMemo(
    () =>
      JSON.stringify({
        role,
        stageCode,
        segmentSvgName,
        filters: effectiveFilters,
        sortCode: effectiveSortCode,
      }),
    [effectiveFilters, effectiveSortCode, role, segmentSvgName, stageCode]
  );
  const [items, setItems] = useState<MarketplaceHubItem[]>([]);
  const itemsRef = useRef<MarketplaceHubItem[]>([]);
  const listRef = useRef<FlatList<MarketplaceHubItem>>(null);
  const filterButtonRef = useRef<View | null>(null);
  const sortButtonRef = useRef<View | null>(null);
  const requestGenerationRef = useRef(0);
  const lastAnnouncementRef = useRef("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const { favoriteIds, toggle: toggleFavorite } =
    usePurchaseRequestFavorites(role);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!isSeller) return;

    let active = true;
    void getCurrentSellerHomeFilterCategoryOptions(segmentSvgName).then(
      (result) => {
        if (active && result.ok) setSellerCategoryOptions(result.data);
      }
    );

    return () => {
      active = false;
    };
  }, [isSeller, segmentSvgName]);

  const loadPage = useCallback(
    async (
      nextPage: number,
      replace: boolean,
      resetScroll = false
    ) => {
      if (!stageCode) {
        requestGenerationRef.current += 1;
        setItems([]);
        setTotal(0);
        setHasMore(false);
        setIsLoading(false);
        setHasLoaded(true);
        return;
      }

      const generation = replace
        ? requestGenerationRef.current + 1
        : requestGenerationRef.current;
      if (replace) requestGenerationRef.current = generation;
      const hadItems = itemsRef.current.length > 0;

      if (replace) {
        setInitialError(null);
        setRefreshError(null);
        setLoadMoreError(null);
        setPage(1);
        if (hadItems) setIsRefreshing(true);
        else setIsLoading(true);
        if (resetScroll) {
          requestAnimationFrame(() =>
            listRef.current?.scrollToOffset({ offset: 0, animated: false })
          );
        }
      } else {
        setLoadMoreError(null);
        setIsLoadingMore(true);
      }

      const result =
        role === "buyer"
          ? await getCurrentBuyerMarketplaceHubItems(
              effectiveFilters as BuyerHomeFilters,
              segmentSvgName,
              stageCode,
              effectiveSortCode,
              nextPage,
              PAGE_SIZE
            )
          : await getCurrentSellerMarketplaceHubItems(
              effectiveFilters as SellerHomeFilters,
              segmentSvgName,
              stageCode,
              nextPage,
              PAGE_SIZE,
              effectiveSortCode
            );

      if (generation !== requestGenerationRef.current) return;

      if (result.ok) {
        const nextItems = deduplicateItems(result.data.items);
        setItems((current) =>
          replace ? nextItems : deduplicateItems([...current, ...nextItems])
        );
        setTotal(result.data.total);
        setPage(result.data.page);
        setHasMore(result.data.has_more);
        setInitialError(null);
        setRefreshError(null);
        setLoadMoreError(null);

        if (isSeller && result.data.sort) {
          setSellerSortConfig(result.data.sort);
          if (result.data.sort.selected_code !== sellerSortCode) {
            setSellerSortCode(result.data.sort.selected_code);
          }
        }
      } else if (replace) {
        if (hadItems) {
          setRefreshError(result.error.message);
        } else {
          setItems([]);
          setTotal(0);
          setHasMore(false);
          setInitialError(result.error.message);
        }
      } else {
        setLoadMoreError(result.error.message);
      }

      setHasLoaded(true);
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    },
    [
      effectiveFilters,
      effectiveSortCode,
      isSeller,
      role,
      segmentSvgName,
      sellerSortCode,
      stageCode,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      void loadPage(1, true, true);
      return () => {
        requestGenerationRef.current += 1;
      };
    }, [loadPage])
  );

  useEffect(() => {
    if (
      !isSeller ||
      !hasLoaded ||
      isLoading ||
      isRefreshing ||
      isLoadingMore ||
      initialError
    ) {
      return;
    }

    const announcementKey = `${criteriaKey}:${total}`;
    if (lastAnnouncementRef.current === announcementKey) return;
    lastAnnouncementRef.current = announcementKey;
    AccessibilityInfo.announceForAccessibility(
      `${total} ${total === 1 ? "solicitud encontrada" : "solicitudes encontradas"}`
    );
  }, [
    criteriaKey,
    hasLoaded,
    initialError,
    isLoading,
    isLoadingMore,
    isRefreshing,
    isSeller,
    total,
  ]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || isRefreshing || isLoadingMore) return;
    void loadPage(page + 1, false);
  }, [
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadPage,
    page,
  ]);

  const clearSearch = useCallback(() => {
    setSellerFilters((current) => ({ ...current, searchValue: "" }));
  }, []);

  const clearAll = useCallback(() => {
    setSellerFilters({ ...EMPTY_SELLER_HOME_FILTERS });
    setSellerSortCode(DEFAULT_SELLER_MARKETPLACE_HUB_SORT_CODE);
  }, []);

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, []);

  const openSearchAndFilters = useCallback(() => {
    const chipGroups = [
      ...(sellerCategoryOptions.length > 1
        ? [
            {
              id: "categories",
              label: "Categoría",
              options: sellerCategoryOptions,
              initialSelectedIds: sellerFilters.selectedCategoryIds,
            },
          ]
        : []),
      {
        id: "interactionStates",
        label: "Estado en tu negocio",
        options: SELLER_INTERACTION_OPTIONS,
        initialSelectedIds: sellerFilters.selectedInteractionStates,
      },
    ];

    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Buscar oportunidad o comprador",
        placeholder: "Solicitud, categoría o comprador",
        initialValue: sellerFilters.searchValue,
      },
      dateRangeField: {
        label: "Fecha de publicación",
        startPlaceholder: "Desde",
        endPlaceholder: "Hasta",
        initialStartValue: sellerFilters.startDate,
        initialEndValue: sellerFilters.endDate,
      },
      chipGroups,
      clearLabel: "Limpiar",
      applyLabel: "Aplicar",
      onDismiss: () => restoreAccessibilityFocus(filterButtonRef),
      onClear: () => setSellerFilters({ ...EMPTY_SELLER_HOME_FILTERS }),
      onApply: (values) => {
        const selectedGroups = values.selectedChipGroupIds ?? {};
        setSellerFilters((current) =>
          normalizeSellerListingFilters({
            ...current,
            searchValue: values.searchValue,
            startDate: values.startDate,
            endDate: values.endDate,
            selectedCategoryIds: selectedGroups.categories ?? [],
            selectedInteractionStates: (
              selectedGroups.interactionStates ?? []
            ) as SellerHomeInteractionState[],
          })
        );
      },
    });
  }, [sellerCategoryOptions, sellerFilters]);

  const openSort = useCallback(() => {
    if (sellerSortPresentation.options.length === 0) return;

    openPopup({
      type: "sort",
      title: "Ordenar oportunidades",
      options: sellerSortPresentation.options.map((option) => ({
        id: option.code,
        label: option.label,
      })),
      initialSelectedId: sellerSortCode,
      onDismiss: () => restoreAccessibilityFocus(sortButtonRef),
      onSelect: (optionId) => {
        setSellerSortCode(optionId);
      },
    });
  }, [sellerSortCode, sellerSortPresentation]);

  const selectedSortLabel =
    sellerSortPresentation.options.find(
      (option) => option.code === sellerSortCode
    )?.label ?? "Recomendadas";
  const activeFilterCount = countSellerFilterGroups(sellerFilters);
  const hasActiveSellerFilters = hasSellerListingFilters(sellerFilters);
  const hasCustomSellerSort =
    sellerSortCode !==
    sellerSortPresentation.default_code;

  const criteriaChips = useMemo<CriteriaChip[]>(() => {
    if (!isSeller) return [];
    const chips: CriteriaChip[] = [];

    if (sellerFilters.searchValue) {
      chips.push({
        id: "search",
        label: `“${sellerFilters.searchValue}”`,
        onRemove: clearSearch,
      });
    }
    if (sellerFilters.startDate || sellerFilters.endDate) {
      const label =
        sellerFilters.startDate && sellerFilters.endDate
          ? `${sellerFilters.startDate} – ${sellerFilters.endDate}`
          : sellerFilters.startDate
            ? `Desde ${sellerFilters.startDate}`
            : `Hasta ${sellerFilters.endDate}`;
      chips.push({
        id: "date",
        label,
        onRemove: () =>
          setSellerFilters((current) => ({
            ...current,
            startDate: "",
            endDate: "",
          })),
      });
    }

    sellerFilters.selectedCategoryIds.forEach((categoryId) => {
      const category = sellerCategoryOptions.find(
        (option) => option.id === categoryId
      );
      chips.push({
        id: `category-${categoryId}`,
        label: category?.label ?? "Categoría",
        onRemove: () =>
          setSellerFilters((current) => ({
            ...current,
            selectedCategoryIds: current.selectedCategoryIds.filter(
              (id) => id !== categoryId
            ),
          })),
      });
    });

    sellerFilters.selectedInteractionStates.forEach((interactionState) => {
      const option = SELLER_INTERACTION_OPTIONS.find(
        (item) => item.id === interactionState
      );
      chips.push({
        id: `interaction-${interactionState}`,
        label: option?.label ?? interactionState,
        onRemove: () =>
          setSellerFilters((current) => ({
            ...current,
            selectedInteractionStates:
              current.selectedInteractionStates.filter(
                (state) => state !== interactionState
              ),
          })),
      });
    });

    if (hasCustomSellerSort) {
      chips.push({
        id: "sort",
        label: selectedSortLabel,
        onRemove: () =>
          setSellerSortCode(sellerSortPresentation.default_code),
      });
    }

    return chips;
  }, [
    clearSearch,
    hasCustomSellerSort,
    isSeller,
    selectedSortLabel,
    sellerCategoryOptions,
    sellerFilters,
    sellerSortPresentation.default_code,
  ]);

  const listHeader = (
    <View style={s.listHeader}>
      {description ? (
        <Text variant="body" color="textMedium">
          {description}
        </Text>
      ) : null}
      <View style={s.resultSummary}>
        <Text
          variant="body"
          color="textMedium"
          accessibilityLiveRegion="polite"
        >
          {total} {total === 1 ? "solicitud" : "solicitudes"}
        </Text>
        {isSeller && (hasActiveSellerFilters || hasCustomSellerSort) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Limpiar todos los filtros y el orden"
            onPress={clearAll}
            hitSlop={8}
            style={s.clearAllButton}
          >
            <Text variant="small" style={s.clearAllText}>
              Limpiar todo
            </Text>
          </Pressable>
        ) : null}
      </View>
      {criteriaChips.length > 0 ? (
        <View style={s.criteriaChips}>
          {criteriaChips.map((chip) => (
            <LuppitChip
              key={chip.id}
              label={chip.label}
              onRemove={chip.onRemove}
              bordered
            />
          ))}
        </View>
      ) : null}
      {refreshError ? (
        <View style={s.inlineError}>
          <Text variant="small" color="textMedium" style={s.inlineErrorText}>
            No se pudieron actualizar los resultados.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadPage(1, true)}
            style={s.inlineAction}
          >
            <Text variant="small" style={s.inlineActionText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const listEmpty = isLoading ? (
    <View style={s.emptyStateWrapper}>
      <LoadingState label="Cargando solicitudes..." />
    </View>
  ) : initialError ? (
    <View style={s.emptyStateWrapper}>
      <StandaloneListEmptyState
        icon="alert-circle"
        title="No pudimos cargar las oportunidades"
        description={initialError}
        actionLabel="Reintentar"
        onAction={() => void loadPage(1, true)}
      />
    </View>
  ) : (
    <View style={s.emptyStateWrapper}>
      <StandaloneListEmptyState
        icon={isSeller && hasActiveSellerFilters ? "search" : "folder-closed"}
        title={
          isSeller && hasActiveSellerFilters
            ? "No encontramos oportunidades"
            : "No hay oportunidades disponibles"
        }
        description={
          isSeller && hasActiveSellerFilters
            ? "Prueba cambiando la búsqueda o limpiando los filtros."
            : "Cuando aparezcan nuevas solicitudes para ti, las verás aquí."
        }
        actionLabel={
          isSeller && hasActiveSellerFilters ? "Limpiar filtros" : null
        }
        actionIcon={
          isSeller && hasActiveSellerFilters ? "x" : undefined
        }
        onAction={
          isSeller && hasActiveSellerFilters ? clearAll : undefined
        }
      />
    </View>
  );

  const listFooter = isLoadingMore ? (
    <View style={s.footerState}>
      <ActivityIndicator color={t.colors.primary} />
      <Text variant="small" color="textMedium">
        Cargando más solicitudes…
      </Text>
    </View>
  ) : loadMoreError ? (
    <View style={s.footerState}>
      <Text variant="small" color="textMedium">
        No se pudieron cargar más solicitudes.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={loadMore}
        style={s.secondaryAction}
      >
        <Text variant="body">Reintentar cargar más</Text>
      </Pressable>
    </View>
  ) : hasMore ? (
    <View style={s.footerState}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cargar más solicitudes"
        onPress={loadMore}
        style={s.secondaryAction}
      >
        <Text variant="body">Cargar más</Text>
      </Pressable>
    </View>
  ) : items.length > 0 ? (
    <View style={s.footerState}>
      <Text variant="small" color="textMedium">
        Has visto todas las solicitudes.
      </Text>
    </View>
  ) : null;

  return (
    <View style={s.screen}>
      {isSeller ? (
        <GlassSurface
          variant="chrome"
          blur="chrome"
          style={s.topBar}
          clipStyle={s.topBarClip}
          contentStyle={s.topBarContent}
        >
          <View style={s.topBarTitleRow}>
            <Pressable
              onPress={handleBackPress}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={12}
              style={s.topBarSide}
            >
              <Icon name="arrow-left" size={28} color={t.colors.textDark} />
            </Pressable>

            <Text
              variant="subtitle"
              align="center"
              maxLines={1}
              accessibilityRole="header"
              style={s.topBarTitle}
            >
              {title}
            </Text>

            <View style={s.topBarSide} />
          </View>

          <View style={s.topBarAccessory}>
            <View style={s.toolbar}>
              <Pressable
                ref={filterButtonRef}
                accessibilityRole="button"
                accessibilityLabel={
                  activeFilterCount > 0
                    ? `Buscar y filtrar oportunidades. ${activeFilterCount} ${
                        activeFilterCount === 1
                          ? "filtro activo"
                          : "filtros activos"
                      }`
                    : "Buscar y filtrar oportunidades"
                }
                accessibilityHint="Busca por solicitud, categoría o nombre del comprador"
                onPress={openSearchAndFilters}
                style={s.searchTrigger}
              >
                <Icon
                  name="sliders-horizontal"
                  size={20}
                  color={t.colors.stateAnulated}
                />
                <Text
                  variant="body"
                  color="stateAnulated"
                  style={s.searchTriggerText}
                >
                  {activeFilterCount > 0
                    ? `Filtros activos (${activeFilterCount})`
                    : "Buscar y filtrar"}
                </Text>
              </Pressable>

              <Pressable
                ref={sortButtonRef}
                accessibilityRole="button"
                accessibilityLabel={`Ordenar oportunidades. Orden actual: ${selectedSortLabel}`}
                onPress={openSort}
                style={s.sortButton}
              >
                <Icon
                  name="arrow-up-down"
                  size={24}
                  color={t.colors.stateAnulated}
                />
              </Pressable>
            </View>
          </View>
        </GlassSurface>
      ) : null}

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.purchase_request_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.listContent,
          {
            paddingTop: topContentInset + t.spacing.md,
          },
        ]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        onRefresh={() => void loadPage(1, true)}
        refreshing={isRefreshing}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        renderItem={({ item }) => (
          <MarketplaceRequestCard
            item={item}
            role={role}
            showSellerDiscoveryDetails={isSeller}
            onPress={() =>
              role === "buyer"
                ? openBuyerRequest(item)
                : void openSellerRequest(item)
            }
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
    </View>
  );
}

function createStyles(t: Theme, topInset: number) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    topBar: {
      position: "absolute",
      top: 0,
      left: -t.spacing.md,
      right: -t.spacing.md,
      zIndex: 10,
      elevation: Platform.OS === "android" ? 4 : 10,
      height: topInset + SELLER_TOP_BAR_VISIBLE_HEIGHT,
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
      paddingTop: topInset + t.spacing.xs,
      paddingHorizontal: t.spacing.xl,
      paddingBottom: t.spacing.sm,
    },
    topBarTitleRow: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    topBarSide: {
      width: 44,
      height: 44,
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
    toolbar: {
      height: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    searchTrigger: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      borderRadius: 999,
      ...t.glass.headerControl,
      paddingHorizontal: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    searchTriggerText: {
      flex: 1,
    },
    sortButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      flexGrow: 1,
      gap: t.spacing.md,
      paddingBottom: t.spacing.xl,
    },
    listHeader: {
      gap: t.spacing.sm,
      paddingBottom: t.spacing.sm,
    },
    resultSummary: {
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    clearAllButton: {
      minHeight: 44,
      paddingHorizontal: t.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    clearAllText: {
      color: t.colors.primary,
    },
    criteriaChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    inlineError: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    inlineErrorText: {
      flex: 1,
    },
    inlineAction: {
      minWidth: 88,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    inlineActionText: {
      color: t.colors.primary,
    },
    emptyStateWrapper: {
      flex: 1,
      minHeight: 340,
      paddingHorizontal: t.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    footerState: {
      minHeight: 72,
      paddingVertical: t.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    secondaryAction: {
      minHeight: 48,
      paddingHorizontal: t.spacing.lg,
      borderRadius: t.borders.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
