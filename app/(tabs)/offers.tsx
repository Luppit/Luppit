import GlassSurface from "@/src/components/glass/GlassSurface";
import LuppitChip from "@/src/components/chip/LuppitChip";
import RoleGate from "@/src/components/role/RoleGate";
import LoadingState from "@/src/components/loading/LoadingState";
import { openPurchaseRequestCardMenu } from "@/src/components/marketplaceHub/openPurchaseRequestCardMenu";
import StandaloneListEmptyState from "@/src/components/standaloneList/StandaloneListEmptyState";
import usePurchaseRequestFavorites from "@/src/components/marketplaceHub/usePurchaseRequestFavorites";
import SellerOfferCard from "@/src/components/sellerOfferCard/SellerOfferCard";
import { Text } from "@/src/components/Text";
import { Icon } from "@/src/components/Icon";
import {
  getCurrentSellerPurchaseOffers,
  SellerOfferLifecycleScope,
  SellerPurchaseOfferCardData,
} from "@/src/services/purchase.offer.service";
import { getConversationByPurchaseOfferId } from "@/src/services/conversation.service";
import { openPopup } from "@/src/services/popup.service";
import { Theme, useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showError, showInfo } from "@/src/utils/useToast";

const SELLER_OFFER_SORT_OPTIONS = [
  { id: "newly_listed", label: "Oferta más reciente" },
  { id: "offer_created_oldest", label: "Fecha de oferta: más antigua" },
  { id: "price_col_low_to_high", label: "CRC: menor precio primero" },
  { id: "price_col_high_to_low", label: "CRC: mayor precio primero" },
  { id: "price_usd_low_to_high", label: "USD: menor precio primero" },
  { id: "price_usd_high_to_low", label: "USD: mayor precio primero" },
];
const DEFAULT_SELLER_OFFER_SORT_ID = SELLER_OFFER_SORT_OPTIONS[0].id;

type SellerOfferFilters = {
  searchValue: string;
  startDate: string;
  endDate: string;
  selectedCategoryIds: string[];
  selectedCurrencyIds: string[];
  selectedConversationStatusCodes: string[];
};

const EMPTY_SELLER_OFFER_FILTERS: SellerOfferFilters = {
  searchValue: "",
  startDate: "",
  endDate: "",
  selectedCategoryIds: [],
  selectedCurrencyIds: [],
  selectedConversationStatusCodes: [],
};

function normalizeFilterList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function hasSellerOfferFilters(filters: SellerOfferFilters) {
  return Boolean(
    filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedCategoryIds.length > 0 ||
      filters.selectedCurrencyIds.length > 0 ||
      filters.selectedConversationStatusCodes.length > 0
  );
}

function countSellerOfferFilterGroups(filters: SellerOfferFilters) {
  return [
    filters.searchValue,
    filters.startDate || filters.endDate,
    filters.selectedCategoryIds.length > 0,
    filters.selectedCurrencyIds.length > 0,
    filters.selectedConversationStatusCodes.length > 0,
  ].filter(Boolean).length;
}

function hasAdvancedSellerOfferFilters(filters: SellerOfferFilters) {
  return Boolean(
    filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedCategoryIds.length > 0 ||
      filters.selectedCurrencyIds.length > 0
  );
}

function countAdvancedSellerOfferFilterGroups(filters: SellerOfferFilters) {
  return [
    filters.searchValue,
    filters.startDate || filters.endDate,
    filters.selectedCategoryIds.length > 0,
    filters.selectedCurrencyIds.length > 0,
  ].filter(Boolean).length;
}

function getSortLabel(sortId: string) {
  return SELLER_OFFER_SORT_OPTIONS.find((option) => option.id === sortId)?.label ?? "Orden";
}

export default function OffersScreen() {
  const t = useTheme();
  const s = React.useMemo(() => createOffersScreenStyles(t), [t]);

  return (
    <View style={s.screen}>
      <RoleGate
        loading={
          <>
            <OffersTopBar title="Mis ofertas" />
            <LoadingState label="Cargando contenido..." />
          </>
        }
        buyer={
          <>
            <OffersTopBar title="Mis ofertas" />
            <Text variant="title">Offers Buyer</Text>
          </>
        }
        seller={<SellerOffersContent />}
      />
    </View>
  );
}

function SellerOffersContent() {
  const t = useTheme();
  const s = React.useMemo(() => createOffersScreenStyles(t, 0, true), [t]);
  const { favoriteIds, toggle: toggleFavorite } = usePurchaseRequestFavorites("seller");
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [offers, setOffers] = React.useState<SellerPurchaseOfferCardData[]>([]);
  const [filterOptionsSource, setFilterOptionsSource] = React.useState<
    SellerPurchaseOfferCardData[]
  >([]);
  const [filters, setFilters] = React.useState<SellerOfferFilters>(
    EMPTY_SELLER_OFFER_FILTERS
  );
  const [selectedSortId, setSelectedSortId] = React.useState(DEFAULT_SELLER_OFFER_SORT_ID);
  const [lifecycleScope, setLifecycleScope] =
    React.useState<SellerOfferLifecycleScope>("active");
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const openOfferConversation = React.useCallback(
    async (offer: SellerPurchaseOfferCardData) => {
      if (offer.conversation_id) {
        router.push({
          pathname: "/(conversation)/offer",
          params: {
            conversationId: offer.conversation_id,
            title: offer.request_title ?? "Conversación",
          },
        });
        return;
      }

      const conversation = await getConversationByPurchaseOfferId(offer.id);
      if (!conversation) {
        showInfo("Sin conversación", "Esta oferta todavía no tiene conversación.");
        return;
      }
      if (!conversation.ok) {
        showError("No se pudo abrir la conversación", conversation.error.message);
        return;
      }

      router.push({
        pathname: "/(conversation)/offer",
        params: {
          conversationId: conversation.data.id,
          title: offer.request_title ?? "Conversación",
        },
      });
    },
    []
  );

  const loadFilterOptions = React.useCallback(async () => {
    const result = await getCurrentSellerPurchaseOffers(
      EMPTY_SELLER_OFFER_FILTERS,
      DEFAULT_SELLER_OFFER_SORT_ID,
      lifecycleScope
    );
    if (!isMountedRef.current || !result.ok) return;
    setFilterOptionsSource(result.data);
  }, [lifecycleScope]);

  const loadOffers = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await getCurrentSellerPurchaseOffers(
      filters,
      selectedSortId,
      lifecycleScope
    );
    if (!isMountedRef.current) return;

    if (result.ok) {
      setOffers(result.data);
    } else {
      setOffers([]);
      setLoadError(result.error.message);
      showError("No se pudieron cargar tus ofertas", result.error.message);
    }

    setIsLoading(false);
  }, [filters, lifecycleScope, selectedSortId]);

  useFocusEffect(
    React.useCallback(() => {
      void loadFilterOptions();
      return () => {};
    }, [loadFilterOptions])
  );

  useFocusEffect(
    React.useCallback(() => {
      void loadOffers();
      return () => {};
    }, [loadOffers])
  );

  const categoryOptions = React.useMemo(() => {
    const optionsById = new Map<string, { id: string; label: string }>();

    filterOptionsSource.forEach((offer) => {
      const label = offer.request_category_name?.trim();
      const id = offer.request_category_id?.trim();
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, { id, label });
    });

    return Array.from(optionsById.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filterOptionsSource]);

  const currencyOptions = React.useMemo(() => {
    const optionsById = new Map<string, { id: string; label: string }>();

    filterOptionsSource.forEach((offer) => {
      const label = offer.offer_currency_code?.trim();
      const id = offer.currency_id?.trim();
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, { id, label });
    });

    return Array.from(optionsById.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [filterOptionsSource]);

  const statusOptions = React.useMemo(() => {
    const optionsById = new Map<
      string,
      { id: string; label: string; sortOrder: number | null }
    >();

    filterOptionsSource.forEach((offer) => {
      const id = offer.conversation_status_code?.trim();
      const label = offer.conversation_status_label?.trim();
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, {
        id,
        label,
        sortOrder: offer.conversation_status_sort_order,
      });
    });

    return Array.from(optionsById.values()).sort((a, b) => {
      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB || a.label.localeCompare(b.label, "es");
    });
  }, [filterOptionsSource]);

  const visibleOffers = offers;

  const hasActiveFilters = React.useMemo(() => hasSellerOfferFilters(filters), [filters]);
  const activeFilterCount = React.useMemo(
    () => countSellerOfferFilterGroups(filters),
    [filters]
  );
  const hasAdvancedFilters = React.useMemo(
    () => hasAdvancedSellerOfferFilters(filters),
    [filters]
  );
  const advancedFilterCount = React.useMemo(
    () => countAdvancedSellerOfferFilterGroups(filters),
    [filters]
  );
  const selectedStatusOptions = React.useMemo(() => {
    const labelById = new Map(statusOptions.map((option) => [option.id, option.label]));
    return filters.selectedConversationStatusCodes.map((id) => ({
      id,
      label: labelById.get(id) ?? "Estado",
    }));
  }, [filters.selectedConversationStatusCodes, statusOptions]);
  const hasCustomSort = selectedSortId !== DEFAULT_SELLER_OFFER_SORT_ID;

  const openSearchPopup = React.useCallback(() => {
    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Solicitud, comprador, estado o descripción",
        placeholder: "Buscar ofertas",
        initialValue: filters.searchValue,
      },
      dateRangeField: {
        label: "Fecha de envío",
        startPlaceholder: "Desde",
        endPlaceholder: "Hasta",
        initialStartValue: filters.startDate,
        initialEndValue: filters.endDate,
      },
      chipGroups: [
        {
          id: "statuses",
          label: "Estado de la conversación",
          options: statusOptions,
          initialSelectedIds: filters.selectedConversationStatusCodes,
        },
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
      onClear: () => setFilters(EMPTY_SELLER_OFFER_FILTERS),
      onApply: (values) => {
        const selectedGroups = values.selectedChipGroupIds ?? {};
        setFilters({
          searchValue: values.searchValue.trim(),
          startDate: values.startDate.trim(),
          endDate: values.endDate.trim(),
          selectedCategoryIds: normalizeFilterList(selectedGroups.categories ?? []),
          selectedCurrencyIds: normalizeFilterList(selectedGroups.currencies ?? []),
          selectedConversationStatusCodes: normalizeFilterList(
            selectedGroups.statuses ?? []
          ),
        });
      },
    });
  }, [categoryOptions, currencyOptions, filters, statusOptions]);

  const openSortPopup = React.useCallback(() => {
    openPopup({
      type: "sort",
      title: "Ordenar",
      options: SELLER_OFFER_SORT_OPTIONS,
      initialSelectedId: selectedSortId,
      onSelect: setSelectedSortId,
    });
  }, [selectedSortId]);

  const retryLoad = React.useCallback(() => {
    void loadOffers();
  }, [loadOffers]);

  const clearFilters = React.useCallback(() => {
    setFilters(EMPTY_SELLER_OFFER_FILTERS);
  }, []);

  const clearAdvancedFilters = React.useCallback(() => {
    setFilters((current) => ({
      ...EMPTY_SELLER_OFFER_FILTERS,
      selectedConversationStatusCodes: current.selectedConversationStatusCodes,
    }));
  }, []);

  const removeStatusFilter = React.useCallback((statusCode: string) => {
    setFilters((current) => ({
      ...current,
      selectedConversationStatusCodes: current.selectedConversationStatusCodes.filter(
        (code) => code !== statusCode
      ),
    }));
  }, []);

  const content = (() => {
    if (isLoading) {
      return (
        <View style={s.stateContent}>
          <LoadingState label="Cargando ofertas..." />
        </View>
      );
    }

    if (offers.length === 0) {
      return (
        <View style={s.stateContent}>
          <StandaloneListEmptyState
            icon={loadError ? "alert-circle" : hasActiveFilters ? "search" : "send"}
            title={
              loadError
                ? "No se pudieron cargar tus ofertas"
                : hasActiveFilters
                  ? "No hay ofertas con estos filtros"
                  : lifecycleScope === "history"
                    ? "Aún no hay historial"
                    : "Aún no has enviado ofertas"
            }
            description={
              loadError
                ? loadError
                : hasActiveFilters
                  ? "Prueba otro estado, cambia la búsqueda o limpia los filtros."
                  : lifecycleScope === "history"
                    ? "Las ofertas y compras terminadas aparecerán aquí."
                    : "Tus ofertas aparecerán aquí cuando respondas una solicitud."
            }
            actionLabel={loadError ? "Reintentar" : hasActiveFilters ? "Limpiar filtros" : null}
            actionIcon={loadError ? undefined : hasActiveFilters ? "x" : undefined}
            onAction={loadError ? retryLoad : hasActiveFilters ? clearFilters : undefined}
          />
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.offersList}
      >
        {hasActiveFilters || hasCustomSort ? (
          <View style={s.activeChipsRow}>
            {selectedStatusOptions.map((option) => (
              <LuppitChip
                key={option.id}
                label={option.label}
                selected
                onRemove={() => removeStatusFilter(option.id)}
                removeAccessibilityLabel={`Quitar estado ${option.label}`}
              />
            ))}

            {hasAdvancedFilters ? (
              <LuppitChip
                icon="sliders-horizontal"
                label={`Otros filtros (${advancedFilterCount})`}
                onRemove={clearAdvancedFilters}
                removeAccessibilityLabel="Limpiar otros filtros"
              />
            ) : null}

            {hasCustomSort ? (
              <LuppitChip
                icon="arrow-up-down"
                label={getSortLabel(selectedSortId)}
                onRemove={() => setSelectedSortId(DEFAULT_SELLER_OFFER_SORT_ID)}
                removeAccessibilityLabel="Restablecer orden"
              />
            ) : null}
          </View>
        ) : null}

        {visibleOffers.map((offer) => (
          <SellerOfferCard
            key={offer.id}
            offer={offer}
            onPress={() => void openOfferConversation(offer)}
            onLongPress={
              offer.purchase_request_id
                ? () =>
                    openPurchaseRequestCardMenu({
                      item: {
                        id: offer.purchase_request_id!,
                        title: offer.request_title,
                        category_name: offer.request_category_name,
                      },
                      role: "seller",
                      isFavorite: favoriteIds.has(offer.purchase_request_id!),
                      onToggleFavorite: () =>
                        void toggleFavorite(offer.purchase_request_id!),
                    })
                : undefined
            }
          />
        ))}
      </ScrollView>
    );
  })();

  const toolbar = (
    <View style={s.toolbarStack}>
      <View style={s.scopeRow}>
        <LuppitChip
          label="Ofertas"
          selected={lifecycleScope === "active"}
          onPress={() => setLifecycleScope("active")}
          accessibilityLabel="Mostrar ofertas sin completar"
          style={s.scopeChip}
        />
        <LuppitChip
          label="Historial"
          selected={lifecycleScope === "history"}
          onPress={() => setLifecycleScope("history")}
          accessibilityLabel="Mostrar historial de ofertas y compras"
          style={s.scopeChip}
        />
      </View>

      <View style={s.toolbar}>
        <Pressable
          style={s.searchTrigger}
          onPress={openSearchPopup}
          accessibilityRole="button"
          accessibilityLabel={
            hasActiveFilters
              ? `Buscar y filtrar ofertas. ${activeFilterCount} filtros activos`
              : "Buscar y filtrar ofertas"
          }
        >
          <Icon name="sliders-horizontal" size={20} color={t.colors.stateAnulated} />
          <Text variant="body" color="stateAnulated" style={s.searchTriggerText}>
            {hasActiveFilters
              ? `Filtros activos (${activeFilterCount})`
              : "Buscar y filtrar"}
          </Text>
        </Pressable>

        <Pressable
          style={s.sortButton}
          onPress={openSortPopup}
          accessibilityRole="button"
          accessibilityLabel="Ordenar ofertas"
        >
          <Icon name="arrow-up-down" size={24} color={t.colors.stateAnulated} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
      <View style={s.content}>
        {content}
      </View>
      <OffersTopBar title="Mis ofertas" accessory={toolbar} />
    </>
  );
}

function OffersTopBar({
  title,
  accessory,
}: {
  title: string;
  accessory?: React.ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = React.useMemo(
    () => createOffersScreenStyles(t, insets.top, Boolean(accessory)),
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
        <Pressable onPress={goBack} hitSlop={12} style={s.topBarSide}>
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

function createOffersScreenStyles(t: Theme, topInset = 0, hasTopBarAccessory = false) {
  const topOffset = topInset + t.spacing.md;
  const topBarVisibleHeight = hasTopBarAccessory ? 184 : 72;
  const topBarHeight = topOffset + (hasTopBarAccessory ? 184 : 72);

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    topBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      elevation: Platform.OS === "android" ? 4 : 10,
      height: topBarHeight,
      marginHorizontal: -t.spacing.md,
      marginTop: -topOffset,
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
      height: 104,
      marginTop: t.spacing.sm,
    },
    content: {
      flex: 1,
      gap: t.spacing.md,
    },
    stateContent: {
      flex: 1,
      paddingTop: topBarVisibleHeight + t.spacing.md,
      paddingHorizontal: t.spacing.lg,
      justifyContent: "center",
    },
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    toolbarStack: {
      gap: t.spacing.sm,
    },
    scopeRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
    },
    scopeChip: {
      flex: 1,
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
    searchTriggerText: {
      flex: 1,
    },
    activeChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    sortButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    offersList: {
      gap: t.spacing.md,
      paddingTop: topBarVisibleHeight + t.spacing.md,
      paddingBottom: 112,
    },
  });
}
