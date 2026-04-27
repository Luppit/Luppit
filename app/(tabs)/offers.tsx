import RoleGate from "@/src/components/role/RoleGate";
import SellerOfferCard from "@/src/components/sellerOfferCard/SellerOfferCard";
import { Text } from "@/src/components/Text";
import { Icon } from "@/src/components/Icon";
import {
  getCurrentSellerPurchaseOffers,
  SellerPurchaseOfferCardData,
} from "@/src/services/purchase.offer.service";
import { getConversationByPurchaseOfferId } from "@/src/services/conversation.service";
import { openPopup } from "@/src/services/popup.service";
import { Theme, useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { showError, showInfo } from "@/src/utils/useToast";

const SELLER_OFFER_SORT_OPTIONS = [
  { id: "newly_listed", label: "Más recientes" },
  { id: "offer_created_newest", label: "Fecha de oferta: más reciente" },
  { id: "offer_created_oldest", label: "Fecha de oferta: más antigua" },
  { id: "price_col_low_to_high", label: "COL: menor precio primero" },
  { id: "price_col_high_to_low", label: "COL: mayor precio primero" },
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
};

const EMPTY_SELLER_OFFER_FILTERS: SellerOfferFilters = {
  searchValue: "",
  startDate: "",
  endDate: "",
  selectedCategoryIds: [],
  selectedCurrencyIds: [],
};

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseDateTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getDateOnlyTime(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
}

function normalizeFilterList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function getOfferCategoryFilterId(offer: SellerPurchaseOfferCardData) {
  return normalizeSearchValue(offer.request_category_name);
}

function getOfferCurrencyFilterId(offer: SellerPurchaseOfferCardData) {
  return normalizeSearchValue(offer.offer_currency_code);
}

function hasSellerOfferFilters(filters: SellerOfferFilters) {
  return Boolean(
    filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedCategoryIds.length > 0 ||
      filters.selectedCurrencyIds.length > 0
  );
}

function countSellerOfferFilterGroups(filters: SellerOfferFilters) {
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

function compareOfferPriceByCurrency(
  a: SellerPurchaseOfferCardData,
  b: SellerPurchaseOfferCardData,
  currencyCode: "col" | "usd",
  direction: "asc" | "desc"
) {
  const aMatchesCurrency = getOfferCurrencyFilterId(a) === currencyCode;
  const bMatchesCurrency = getOfferCurrencyFilterId(b) === currencyCode;

  if (aMatchesCurrency !== bMatchesCurrency) {
    return aMatchesCurrency ? -1 : 1;
  }

  if (aMatchesCurrency && bMatchesCurrency) {
    const priceDiff = Number(a.price ?? 0) - Number(b.price ?? 0);
    return direction === "asc" ? priceDiff : -priceDiff;
  }

  return parseDateTime(b.created_at) - parseDateTime(a.created_at);
}

export default function OffersScreen() {
  const t = useTheme();
  const s = React.useMemo(() => createOffersScreenStyles(t), [t]);

  return (
    <View style={s.screen}>
      <OffersTopBar title="Todas mis ofertas" />
      <RoleGate
        loading={<Text>Cargando contenido...</Text>}
        buyer={<Text variant="title">Offers Buyer</Text>}
        seller={<SellerOffersContent />}
      />
    </View>
  );
}

function SellerOffersContent() {
  const t = useTheme();
  const s = React.useMemo(() => createOffersScreenStyles(t), [t]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [offers, setOffers] = React.useState<SellerPurchaseOfferCardData[]>([]);
  const [filters, setFilters] = React.useState<SellerOfferFilters>(
    EMPTY_SELLER_OFFER_FILTERS
  );
  const [selectedSortId, setSelectedSortId] = React.useState(DEFAULT_SELLER_OFFER_SORT_ID);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const openOfferConversation = React.useCallback(
    async (offer: SellerPurchaseOfferCardData) => {
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

  const loadOffers = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await getCurrentSellerPurchaseOffers();
    if (!isMountedRef.current) return;

    if (result.ok) {
      setOffers(result.data);
    } else {
      setOffers([]);
      setLoadError(result.error.message);
      showError("No se pudieron cargar tus ofertas", result.error.message);
    }

    setIsLoading(false);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadOffers();
      return () => {};
    }, [loadOffers])
  );

  React.useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const categoryOptions = React.useMemo(() => {
    const optionsById = new Map<string, { id: string; label: string }>();

    offers.forEach((offer) => {
      const label = offer.request_category_name?.trim();
      const id = getOfferCategoryFilterId(offer);
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, { id, label });
    });

    return Array.from(optionsById.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [offers]);

  const currencyOptions = React.useMemo(() => {
    const optionsById = new Map<string, { id: string; label: string }>();

    offers.forEach((offer) => {
      const label = offer.offer_currency_code?.trim();
      const id = getOfferCurrencyFilterId(offer);
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, { id, label });
    });

    return Array.from(optionsById.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [offers]);

  const visibleOffers = React.useMemo(() => {
    const searchNeedle = normalizeSearchValue(filters.searchValue);
    const startTime = getDateOnlyTime(filters.startDate);
    const endTime = getDateOnlyTime(filters.endDate);
    const selectedCategoryIds = new Set(filters.selectedCategoryIds);
    const selectedCurrencyIds = new Set(filters.selectedCurrencyIds);

    const filteredOffers = offers.filter((offer) => {
      if (searchNeedle) {
        const searchableText = normalizeSearchValue(
          [
            offer.request_title,
            offer.description,
            offer.request_profile_name,
            offer.request_category_name,
            offer.offer_currency_code,
          ].join(" ")
        );
        if (!searchableText.includes(searchNeedle)) return false;
      }

      const offerDate = getDateOnlyTime(offer.created_at);
      if (startTime != null && (offerDate == null || offerDate < startTime)) return false;
      if (endTime != null && (offerDate == null || offerDate > endTime)) return false;

      if (
        selectedCategoryIds.size > 0 &&
        !selectedCategoryIds.has(getOfferCategoryFilterId(offer))
      ) {
        return false;
      }

      if (
        selectedCurrencyIds.size > 0 &&
        !selectedCurrencyIds.has(getOfferCurrencyFilterId(offer))
      ) {
        return false;
      }

      return true;
    });

    return [...filteredOffers].sort((a, b) => {
      if (selectedSortId === "offer_created_oldest") {
        return parseDateTime(a.created_at) - parseDateTime(b.created_at);
      }

      if (selectedSortId === "price_col_low_to_high") {
        return compareOfferPriceByCurrency(a, b, "col", "asc");
      }

      if (selectedSortId === "price_col_high_to_low") {
        return compareOfferPriceByCurrency(a, b, "col", "desc");
      }

      if (selectedSortId === "price_usd_low_to_high") {
        return compareOfferPriceByCurrency(a, b, "usd", "asc");
      }

      if (selectedSortId === "price_usd_high_to_low") {
        return compareOfferPriceByCurrency(a, b, "usd", "desc");
      }

      return parseDateTime(b.created_at) - parseDateTime(a.created_at);
    });
  }, [filters, offers, selectedSortId]);

  const hasActiveFilters = React.useMemo(() => hasSellerOfferFilters(filters), [filters]);
  const activeFilterCount = React.useMemo(
    () => countSellerOfferFilterGroups(filters),
    [filters]
  );
  const hasCustomSort = selectedSortId !== DEFAULT_SELLER_OFFER_SORT_ID;

  const openSearchPopup = React.useCallback(() => {
    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Oferta, solicitud o comprador",
        placeholder: "Buscar",
        initialValue: filters.searchValue,
      },
      dateRangeField: {
        label: "Fecha de la oferta",
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
      onClear: () => setFilters(EMPTY_SELLER_OFFER_FILTERS),
      onApply: (values) => {
        const selectedGroups = values.selectedChipGroupIds ?? {};
        setFilters({
          searchValue: values.searchValue.trim(),
          startDate: values.startDate.trim(),
          endDate: values.endDate.trim(),
          selectedCategoryIds: normalizeFilterList(selectedGroups.categories ?? []),
          selectedCurrencyIds: normalizeFilterList(selectedGroups.currencies ?? []),
        });
      },
    });
  }, [categoryOptions, currencyOptions, filters]);

  const openSortPopup = React.useCallback(() => {
    openPopup({
      type: "sort",
      title: "Ordenar",
      options: SELLER_OFFER_SORT_OPTIONS,
      initialSelectedId: selectedSortId,
      onSelect: setSelectedSortId,
    });
  }, [selectedSortId]);

  const content = (() => {
    if (isLoading) {
      return <Text>Cargando ofertas...</Text>;
    }

    if (offers.length === 0) {
      return (
        <Text color="stateAnulated">
          {loadError
            ? "No se pudieron cargar tus ofertas."
            : "Cuando envíes ofertas, aparecerán aquí."}
        </Text>
      );
    }

    if (visibleOffers.length === 0) {
      return (
        <Text color="stateAnulated">
          No encontramos ofertas con los filtros aplicados.
        </Text>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.offersList}
      >
        {visibleOffers.map((offer) => (
          <SellerOfferCard
            key={offer.id}
            offer={offer}
            onPress={() => void openOfferConversation(offer)}
          />
        ))}
      </ScrollView>
    );
  })();

  return (
    <View style={s.content}>
      <View style={s.toolbar}>
        <Pressable
          style={s.searchTrigger}
          onPress={openSearchPopup}
          accessibilityRole="button"
        >
          <Icon name="search" size={20} color={t.colors.textDark} />
          <Text variant="body" color="stateAnulated" style={s.searchTriggerText}>
            {hasActiveFilters ? "Filtros aplicados" : "Buscar"}
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

      {hasActiveFilters || hasCustomSort ? (
        <View style={s.activeChipsRow}>
          {hasActiveFilters ? (
            <View style={s.activeChip}>
              <Icon name="sliders-horizontal" size={16} color={t.colors.textDark} />
              <Text variant="body" style={s.activeChipLabel}>
                Filtros ({activeFilterCount})
              </Text>
              <Pressable
                style={s.activeChipClose}
                onPress={() => setFilters(EMPTY_SELLER_OFFER_FILTERS)}
                accessibilityRole="button"
                accessibilityLabel="Limpiar filtros"
              >
                <Icon name="x" size={16} color={t.colors.textDark} />
              </Pressable>
            </View>
          ) : null}

          {hasCustomSort ? (
            <View style={s.activeChip}>
              <Icon name="arrow-up-down" size={16} color={t.colors.textDark} />
              <Text variant="body" style={s.activeChipLabel} maxLines={1}>
                {getSortLabel(selectedSortId)}
              </Text>
              <Pressable
                style={s.activeChipClose}
                onPress={() => setSelectedSortId(DEFAULT_SELLER_OFFER_SORT_ID)}
                accessibilityRole="button"
                accessibilityLabel="Restablecer orden"
              >
                <Icon name="x" size={16} color={t.colors.textDark} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {content}
    </View>
  );
}

function OffersTopBar({ title }: { title: string }) {
  const t = useTheme();
  const s = React.useMemo(() => createOffersScreenStyles(t), [t]);

  const goBack = React.useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  }, []);

  return (
    <View style={s.topBar}>
      <Pressable onPress={goBack} hitSlop={12} style={s.topBarSide}>
        <Icon name="arrow-left" size={28} color={t.colors.textDark} />
      </Pressable>

      <Text variant="subtitle" align="center" maxLines={1} style={s.topBarTitle}>
        {title}
      </Text>

      <View style={s.topBarSide} />
    </View>
  );
}

function createOffersScreenStyles(t: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    topBar: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: t.colors.background,
    },
    topBarSide: {
      width: 40,
      alignItems: "flex-start",
      justifyContent: "center",
    },
    topBarTitle: {
      flex: 1,
    },
    content: {
      flex: 1,
      gap: t.spacing.md,
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
      backgroundColor: t.colors.backgroudWhite,
      borderWidth: 1,
      borderColor: t.colors.border,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
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
    activeChip: {
      maxWidth: "100%",
      minHeight: 36,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
      paddingLeft: t.spacing.sm,
      paddingRight: t.spacing.xs,
    },
    activeChipLabel: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    activeChipClose: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    sortButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    offersList: {
      gap: t.spacing.md,
      paddingBottom: t.spacing.xl,
    },
  });
}
