import LoadingState from "@/src/components/loading/LoadingState";
import ProductCard from "@/src/components/productCard/ProductCard";
import RoleGate from "@/src/components/role/RoleGate";
import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { getOrCreateCurrentSellerConversationByPurchaseRequestId } from "@/src/services/conversation.service";
import { openPopup } from "@/src/services/popup.service";
import {
  getCurrentBuyerPurchaseRequestFavorites,
  getCurrentSellerPurchaseRequestFavorites,
  PurchaseRequestFavoriteFilters,
  PurchaseRequestFavoriteItem,
} from "@/src/services/purchase.request.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showInfo } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

const FAVORITE_SORT_OPTIONS = [
  { id: "favorited_newest", label: "Guardadas recientemente" },
  { id: "favorited_oldest", label: "Guardadas hace más tiempo" },
  { id: "request_newest", label: "Solicitudes más recientes" },
  { id: "request_oldest", label: "Solicitudes más antiguas" },
  { id: "most_viewed", label: "Más visualizadas" },
  { id: "most_offers", label: "Más ofertas" },
];
const DEFAULT_FAVORITE_SORT_ID = FAVORITE_SORT_OPTIONS[0].id;

const EMPTY_FAVORITE_FILTERS: PurchaseRequestFavoriteFilters = {
  searchValue: "",
  startDate: "",
  endDate: "",
  selectedCategoryIds: [],
  selectedStatusCodes: [],
};

type FavoriteRole = "buyer" | "seller";

function normalizeFilterList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function hasFavoriteFilters(filters: PurchaseRequestFavoriteFilters) {
  return Boolean(
    filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedCategoryIds.length > 0 ||
      filters.selectedStatusCodes.length > 0
  );
}

function countFavoriteFilterGroups(filters: PurchaseRequestFavoriteFilters) {
  return [
    filters.searchValue,
    filters.startDate || filters.endDate,
    filters.selectedCategoryIds.length > 0,
    filters.selectedStatusCodes.length > 0,
  ].filter(Boolean).length;
}

function getSortLabel(sortId: string) {
  return FAVORITE_SORT_OPTIONS.find((option) => option.id === sortId)?.label ?? "Orden";
}

function toPurchaseRequestParam(item: PurchaseRequestFavoriteItem) {
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

async function getFavoritesByRole(
  role: FavoriteRole,
  filters?: PurchaseRequestFavoriteFilters,
  sortId?: string
) {
  if (role === "seller") {
    return getCurrentSellerPurchaseRequestFavorites(filters, sortId);
  }

  return getCurrentBuyerPurchaseRequestFavorites(filters, sortId);
}

export default function FavoritesScreen() {
  const t = useTheme();
  const s = React.useMemo(() => createFavoritesScreenStyles(t), [t]);

  return (
    <View style={s.screen}>
      <FavoritesTopBar title="Favoritas" />
      <RoleGate
        loading={<LoadingState label="Cargando contenido..." />}
        buyer={<FavoriteRequestsContent role="buyer" />}
        seller={<FavoriteRequestsContent role="seller" />}
      />
    </View>
  );
}

function FavoriteRequestsContent({ role }: { role: FavoriteRole }) {
  const t = useTheme();
  const s = React.useMemo(() => createFavoritesScreenStyles(t), [t]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [favorites, setFavorites] = React.useState<PurchaseRequestFavoriteItem[]>([]);
  const [filterOptionsSource, setFilterOptionsSource] = React.useState<
    PurchaseRequestFavoriteItem[]
  >([]);
  const [filters, setFilters] = React.useState<PurchaseRequestFavoriteFilters>(
    EMPTY_FAVORITE_FILTERS
  );
  const [selectedSortId, setSelectedSortId] = React.useState(DEFAULT_FAVORITE_SORT_ID);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadFilterOptions = React.useCallback(async () => {
    const result = await getFavoritesByRole(
      role,
      EMPTY_FAVORITE_FILTERS,
      DEFAULT_FAVORITE_SORT_ID
    );
    if (!isMountedRef.current || !result.ok) return;
    setFilterOptionsSource(result.data);
  }, [role]);

  const loadFavorites = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await getFavoritesByRole(role, filters, selectedSortId);
    if (!isMountedRef.current) return;

    if (result.ok) {
      setFavorites(result.data);
    } else {
      setFavorites([]);
      setLoadError(result.error.message);
      showError("No se pudieron cargar tus favoritas", result.error.message);
    }

    setIsLoading(false);
  }, [filters, role, selectedSortId]);

  useFocusEffect(
    React.useCallback(() => {
      void loadFilterOptions();
      void loadFavorites();
      return () => {};
    }, [loadFavorites, loadFilterOptions])
  );

  React.useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const categoryOptions = React.useMemo(() => {
    const optionsById = new Map<string, { id: string; label: string }>();

    filterOptionsSource.forEach((item) => {
      const id = item.category_id?.trim();
      const label = item.category_name?.trim();
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, { id, label });
    });

    return Array.from(optionsById.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es")
    );
  }, [filterOptionsSource]);

  const statusOptions = React.useMemo(() => {
    const optionsById = new Map<string, { id: string; label: string }>();

    filterOptionsSource.forEach((item) => {
      const id = item.status.trim();
      const label = item.status_label?.trim() || item.status.trim();
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, { id, label });
    });

    return Array.from(optionsById.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es")
    );
  }, [filterOptionsSource]);

  const openFavorite = React.useCallback(
    async (item: PurchaseRequestFavoriteItem) => {
      if (role === "seller") {
        const conversation =
          await getOrCreateCurrentSellerConversationByPurchaseRequestId(item.id);

        if (!conversation) {
          showInfo("Sin conversación", "No se pudo preparar el chat para esta solicitud.");
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
            title: item.title ?? "Conversación",
          },
        });
        return;
      }

      router.push({
        pathname: "/(detail)/purchase-request",
        params: {
          title: item.title ?? "Detalle de solicitud",
          purchaseRequest: JSON.stringify(toPurchaseRequestParam(item)),
        },
      });
    },
    [role]
  );

  const hasActiveFilters = React.useMemo(() => hasFavoriteFilters(filters), [filters]);
  const activeFilterCount = React.useMemo(
    () => countFavoriteFilterGroups(filters),
    [filters]
  );
  const hasCustomSort = selectedSortId !== DEFAULT_FAVORITE_SORT_ID;

  const openSearchPopup = React.useCallback(() => {
    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Solicitud, categoría o estado",
        placeholder: "Buscar",
        initialValue: filters.searchValue,
      },
      dateRangeField: {
        label: "Fecha guardada",
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
          id: "statuses",
          label: "Estado",
          options: statusOptions,
          initialSelectedIds: filters.selectedStatusCodes,
        },
      ],
      clearLabel: "Limpiar",
      applyLabel: "Aplicar",
      onClear: () => setFilters(EMPTY_FAVORITE_FILTERS),
      onApply: (values) => {
        const selectedGroups = values.selectedChipGroupIds ?? {};
        setFilters({
          searchValue: values.searchValue.trim(),
          startDate: values.startDate.trim(),
          endDate: values.endDate.trim(),
          selectedCategoryIds: normalizeFilterList(selectedGroups.categories ?? []),
          selectedStatusCodes: normalizeFilterList(selectedGroups.statuses ?? []),
        });
      },
    });
  }, [categoryOptions, filters, statusOptions]);

  const openSortPopup = React.useCallback(() => {
    openPopup({
      type: "sort",
      title: "Ordenar",
      options: FAVORITE_SORT_OPTIONS,
      initialSelectedId: selectedSortId,
      onSelect: setSelectedSortId,
    });
  }, [selectedSortId]);

  const content = (() => {
    if (isLoading) {
      return <LoadingState label="Cargando favoritas..." />;
    }

    if (favorites.length === 0) {
      return (
        <Text color="stateAnulated">
          {loadError
            ? "No se pudieron cargar tus favoritas."
            : "Cuando guardes solicitudes, aparecerán aquí."}
        </Text>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.favoritesList}
      >
        {favorites.map((item) => (
          <ProductCard
            key={item.favorite_id}
            title={item.title ?? "Solicitud"}
            subtitle={item.category_name ?? "-"}
            views={item.views_count}
            statusLabel={item.status_label ?? item.status}
            offersLabel={`${item.offers_count} ofertas`}
            onPress={() => void openFavorite(item)}
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
          accessibilityLabel="Ordenar favoritas"
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
                onPress={() => setFilters(EMPTY_FAVORITE_FILTERS)}
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
                onPress={() => setSelectedSortId(DEFAULT_FAVORITE_SORT_ID)}
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

function FavoritesTopBar({ title }: { title: string }) {
  const t = useTheme();
  const s = React.useMemo(() => createFavoritesScreenStyles(t), [t]);

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

function createFavoritesScreenStyles(t: Theme) {
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
    favoritesList: {
      gap: t.spacing.md,
      paddingBottom: 112,
    },
  });
}
