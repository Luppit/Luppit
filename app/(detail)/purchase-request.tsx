import { Icon } from "@/src/components/Icon";
import LuppitChip from "@/src/components/chip/LuppitChip";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import OfferCard, {
  OfferCardTimelineItem,
} from "@/src/components/offerCard/OfferCard";
import { Text } from "@/src/components/Text";
import {
  getConversationByPurchaseOfferId,
  getConversationTimeline,
} from "@/src/services/conversation.service";
import {
  getCurrentBuyerPurchaseRequestOffers,
  PurchaseOfferCardData,
} from "@/src/services/purchase.offer.service";
import { openPopup } from "@/src/services/popup.service";
import { getPurchaseRequestVisualizationCount } from "@/src/services/purchase.request.visualization.service";
import {
  getPurchaseRequestById,
  PurchaseRequest,
} from "@/src/services/purchase.request.service";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Theme, useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { lucideIcons, LucideIconName } from "@/src/icons/lucide";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

const BUYER_OFFER_SORT_OPTIONS = [
  { id: "offer_created_newest", label: "Más recientes" },
  { id: "offer_created_oldest", label: "Más antiguas" },
  { id: "price_col_low_to_high", label: "COL: menor precio primero" },
  { id: "price_col_high_to_low", label: "COL: mayor precio primero" },
  { id: "price_usd_low_to_high", label: "USD: menor precio primero" },
  { id: "price_usd_high_to_low", label: "USD: mayor precio primero" },
];
const DEFAULT_BUYER_OFFER_SORT_ID = BUYER_OFFER_SORT_OPTIONS[0].id;

type BuyerOfferFilters = {
  searchValue: string;
  startDate: string;
  endDate: string;
  selectedCurrencyIds: string[];
};

const EMPTY_BUYER_OFFER_FILTERS: BuyerOfferFilters = {
  searchValue: "",
  startDate: "",
  endDate: "",
  selectedCurrencyIds: [],
};

function parsePurchaseRequestParam(
  raw: string | string[] | undefined,
): PurchaseRequest | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    const parsed = JSON.parse(value) as Partial<PurchaseRequest>;
    if (typeof parsed.id !== "string" || parsed.id.trim().length === 0) return null;
    return parsed as PurchaseRequest;
  } catch {
    return null;
  }
}

function normalizeFilterList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function hasBuyerOfferFilters(filters: BuyerOfferFilters) {
  return Boolean(
    filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedCurrencyIds.length > 0
  );
}

function countBuyerOfferFilterGroups(filters: BuyerOfferFilters) {
  return [
    filters.searchValue,
    filters.startDate || filters.endDate,
    filters.selectedCurrencyIds.length > 0,
  ].filter(Boolean).length;
}

function getBuyerOfferSortLabel(sortId: string) {
  return BUYER_OFFER_SORT_OPTIONS.find((option) => option.id === sortId)?.label ?? "Orden";
}

function getEmptyOffersState({
  hasActiveFilters,
  isAcceptedRequest,
  isCanceledRequest,
}: {
  hasActiveFilters: boolean;
  isAcceptedRequest: boolean;
  isCanceledRequest: boolean;
}): {
  icon: LucideIconName;
  title: string;
  description: string;
} {
  if (isCanceledRequest) {
    return {
      icon: "x-circle",
      title: "Compra cerrada",
      description: "Esta solicitud se canceló antes de seleccionar una oferta.",
    };
  }

  if (isAcceptedRequest) {
    return {
      icon: "alert-circle",
      title: "Oferta no disponible",
      description: "No se encontró la oferta seleccionada para esta solicitud.",
    };
  }

  if (hasActiveFilters) {
    return {
      icon: "search",
      title: "No encontramos ofertas",
      description: "Prueba cambiando la búsqueda o limpiando los filtros.",
    };
  }

  return {
    icon: "message-circle",
    title: "Sin ofertas todavía",
    description: "Cuando recibas una oferta, aparecerá aquí.",
  };
}

export default function PurchaseRequestDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createPurchaseRequestDetailStyles(t, topContentInset),
    [t, topContentInset]
  );
  const [offers, setOffers] = useState<PurchaseOfferCardData[]>([]);
  const [filterOptionsSource, setFilterOptionsSource] = useState<
    PurchaseOfferCardData[]
  >([]);
  const [filters, setFilters] =
    useState<BuyerOfferFilters>(EMPTY_BUYER_OFFER_FILTERS);
  const [selectedSortId, setSelectedSortId] = useState(DEFAULT_BUYER_OFFER_SORT_ID);
  const [offersLoading, setOffersLoading] = useState(true);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedOfferTimeline, setSelectedOfferTimeline] = useState<OfferCardTimelineItem[]>(
    []
  );
  const [selectedOfferLoading, setSelectedOfferLoading] = useState(false);
  const [selectedOfferTimelineError, setSelectedOfferTimelineError] = useState<
    string | null
  >(null);
  const [timelineReloadKey, setTimelineReloadKey] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const params = useGlobalSearchParams<{
    purchaseRequest?: string | string[];
  }>();
  const routePurchaseRequest = parsePurchaseRequestParam(params.purchaseRequest);
  const routePurchaseRequestId = routePurchaseRequest?.id ?? "";
  const [refreshedPurchaseRequest, setRefreshedPurchaseRequest] =
    useState<PurchaseRequest | null>(null);
  const purchaseRequest =
    refreshedPurchaseRequest?.id === routePurchaseRequestId
      ? refreshedPurchaseRequest
      : routePurchaseRequest;
  const purchaseRequestId = purchaseRequest?.id ?? "";
  const isAcceptedRequest =
    (purchaseRequest?.status ?? "").trim().toLowerCase() === "offer_accepted";
  const isCanceledRequest =
    (purchaseRequest?.status ?? "").trim().toLowerCase() === "canceled";
  const isTrackedRequest = isAcceptedRequest || isCanceledRequest;
  const offersCount = offers.length;
  const hasActiveFilters = useMemo(() => hasBuyerOfferFilters(filters), [filters]);
  const activeFilterCount = useMemo(
    () => countBuyerOfferFilterGroups(filters),
    [filters]
  );
  const hasCustomSort = selectedSortId !== DEFAULT_BUYER_OFFER_SORT_ID;
  const currencyOptions = useMemo(() => {
    const optionsById = new Map<string, { id: string; label: string }>();

    filterOptionsSource.forEach((offer) => {
      const id = offer.currency_id?.trim();
      const label = offer.offer_currency_code?.trim();
      if (!id || !label || optionsById.has(id)) return;
      optionsById.set(id, { id, label });
    });

    return Array.from(optionsById.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [filterOptionsSource]);
  const displayedOffers = useMemo(() => {
    if (!isTrackedRequest) return offers;
    if (!selectedOfferId) return offers.length === 1 ? offers : [];
    return offers.filter((offer) => offer.id === selectedOfferId);
  }, [isTrackedRequest, offers, selectedOfferId]);

  const displayedOffersCount = displayedOffers.length;
  const emptyOffersState = getEmptyOffersState({
    hasActiveFilters,
    isAcceptedRequest,
    isCanceledRequest,
  });

  useEffect(() => {
    setRefreshedPurchaseRequest(null);
  }, [routePurchaseRequestId]);

  useFocusEffect(
    useCallback(() => {
      if (!routePurchaseRequestId) {
        setRefreshedPurchaseRequest(null);
        return undefined;
      }

      let active = true;

      const loadPurchaseRequest = async () => {
        const result = await getPurchaseRequestById(routePurchaseRequestId);
        if (!active) return;

        if (!result) {
          setRefreshedPurchaseRequest(null);
          return;
        }

        if (result.ok) {
          setRefreshedPurchaseRequest(result.data);
        }
      };

      void loadPurchaseRequest();

      return () => {
        active = false;
      };
    }, [routePurchaseRequestId])
  );

  useEffect(() => {
    let active = true;

    const loadOffers = async () => {
      if (!purchaseRequestId) {
        setOffers([]);
        setOffersLoading(false);
        return;
      }

      setOffersLoading(true);
      const result = await getCurrentBuyerPurchaseRequestOffers(
        purchaseRequestId,
        isTrackedRequest ? EMPTY_BUYER_OFFER_FILTERS : filters,
        isTrackedRequest ? DEFAULT_BUYER_OFFER_SORT_ID : selectedSortId
      );
      if (!active) return;

      if (result.ok) setOffers(result.data);
      else setOffers([]);

      setOffersLoading(false);
    };

    void loadOffers();

    return () => {
      active = false;
    };
  }, [filters, isTrackedRequest, purchaseRequestId, selectedSortId]);

  useEffect(() => {
    let active = true;

    const loadFilterOptions = async () => {
      if (!purchaseRequestId) {
        setFilterOptionsSource([]);
        return;
      }

      if (isCanceledRequest) {
        setFilterOptionsSource([]);
        return;
      }

      const result = await getCurrentBuyerPurchaseRequestOffers(
        purchaseRequestId,
        EMPTY_BUYER_OFFER_FILTERS,
        DEFAULT_BUYER_OFFER_SORT_ID
      );
      if (!active) return;
      setFilterOptionsSource(result.ok ? result.data : []);
    };

    void loadFilterOptions();
    return () => {
      active = false;
    };
  }, [isCanceledRequest, purchaseRequestId]);

  useEffect(() => {
    let active = true;

    const resolveSelectedOffer = async () => {
      if (!isTrackedRequest) {
        setSelectedOfferId(null);
        setSelectedOfferTimeline([]);
        setSelectedOfferTimelineError(null);
        setSelectedOfferLoading(false);
        return;
      }

      if (offersLoading) {
        setSelectedOfferLoading(true);
        setSelectedOfferTimelineError(null);
        return;
      }

      const acceptedOffer = offers.find(
        (offer) =>
          offer.purchase_request_id === purchaseRequestId &&
          Boolean(offer.conversation_id)
      );

      if (!acceptedOffer?.conversation_id) {
        setSelectedOfferId(null);
        setSelectedOfferTimeline([]);
        setSelectedOfferTimelineError(
          offers.length > 0
            ? "No pudimos cargar el seguimiento de esta compra."
            : null
        );
        setSelectedOfferLoading(false);
        return;
      }

      setSelectedOfferLoading(true);
      setSelectedOfferTimelineError(null);
      setSelectedOfferId(acceptedOffer.id);

      const timelineResult = await getConversationTimeline(acceptedOffer.conversation_id);
      if (!active) return;

      if (!timelineResult.ok) {
        setSelectedOfferTimeline([]);
        setSelectedOfferTimelineError("No pudimos cargar el seguimiento de esta compra.");
        setSelectedOfferLoading(false);
        return;
      }

      const timeline = timelineResult.data.map((step) => {
        const rawIcon = (step.icon ?? "").trim();
        const iconName = (rawIcon in lucideIcons ? rawIcon : "circle-help") as LucideIconName;

        return {
          code: step.status_code,
          label: step.label,
          icon: iconName,
          reached_at: step.reached_at,
          reached_at_label: step.reached_at_label,
          pre_label: step.pre_label,
          detail: step.detail,
          style_code: step.style_code,
          method_kind: step.method_kind,
          method_label: step.method_label,
          accessibility_label: step.accessibility_label,
          is_completed: step.is_completed,
          is_next: step.is_next,
        } satisfies OfferCardTimelineItem;
      });

      setSelectedOfferTimeline(timeline);
      setSelectedOfferTimelineError(null);
      setSelectedOfferLoading(false);
    };

    void resolveSelectedOffer();
    return () => {
      active = false;
    };
  }, [isTrackedRequest, offers, offersLoading, purchaseRequestId, timelineReloadKey]);

  const openOfferConversation = async (purchaseOfferId: string) => {
    if (!purchaseRequest) return;

    const conversation = await getConversationByPurchaseOfferId(purchaseOfferId);
    if (!conversation || conversation.ok === false) return;

    router.push({
      pathname: "/(conversation)/offer",
      params: {
        conversationId: conversation.data.id,
        title: purchaseRequest.title ?? "Conversación",
      },
    });
  };

  const openCategoryInfo = () => {
    if (!purchaseRequestId) return;

    router.push({
      pathname: "/(detail)/category-info",
      params: {
        title: "Información de categoría",
        hideMenu: "true",
        purchaseRequestId,
      },
    });
  };

  const openOfferBusiness = (offer: PurchaseOfferCardData) => {
    if (!purchaseRequestId) return;

    router.push({
      pathname: "/(detail)/seller-business",
      params: {
        title: "Negocio",
        hideMenu: "true",
        purchaseRequestId,
        purchaseOfferId: offer.id,
      },
    });
  };

  const openOfferMenu = (offer: PurchaseOfferCardData) => {
    openPopup({
      options: [
        {
          id: "show-business",
          label: "Mostrar negocio",
          icon: "house",
          onPress: () => openOfferBusiness(offer),
        },
      ],
    });
  };

  const openFiltersPopup = () => {
    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Negocio, oferta o moneda",
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
          id: "currencies",
          label: "Moneda",
          options: currencyOptions,
          initialSelectedIds: filters.selectedCurrencyIds,
        },
      ],
      clearLabel: "Limpiar",
      applyLabel: "Aplicar",
      onClear: () => setFilters(EMPTY_BUYER_OFFER_FILTERS),
      onApply: (values) => {
        const selectedGroups = values.selectedChipGroupIds ?? {};
        setFilters({
          searchValue: values.searchValue.trim(),
          startDate: values.startDate.trim(),
          endDate: values.endDate.trim(),
          selectedCurrencyIds: normalizeFilterList(selectedGroups.currencies ?? []),
        });
      },
    });
  };

  const openSortPopup = () => {
    openPopup({
      type: "sort",
      title: "Ordenar",
      options: BUYER_OFFER_SORT_OPTIONS,
      initialSelectedId: selectedSortId,
      onSelect: setSelectedSortId,
    });
  };

  useEffect(() => {
    let active = true;

    const loadVisualizations = async () => {
      if (!purchaseRequestId) {
        setViewsCount(0);
        return;
      }

      const result = await getPurchaseRequestVisualizationCount(purchaseRequestId);
      if (!active) return;
      setViewsCount(result.ok ? result.data : 0);
    };

    void loadVisualizations();
    return () => {
      active = false;
    };
  }, [purchaseRequestId]);

  if (!purchaseRequest) {
    return (
      <View style={s.centerState}>
        <Text align="center" color="stateAnulated">
          No encontramos esta solicitud.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <View style={s.body}>
        <View style={s.summaryCard}>
          <Text variant="body" color="textMedium">
            {purchaseRequest.summary_text ?? ""}
          </Text>

          <View style={s.viewsRow}>
            <Text color="stateAnulated">Visualizaciones</Text>
            <Icon name="eye" size={20} color={t.colors.stateAnulated} />
            <Text color="stateAnulated">{String(viewsCount)}</Text>
          </View>
        </View>

        {isCanceledRequest ? (
          <View style={s.canceledCard}>
            <View style={s.statusTitleRow}>
              <Icon name="x-circle" size={20} color={t.colors.stateCanceled} />
              <Text variant="subtitle" style={s.canceledTitle}>
                Solicitud cancelada
              </Text>
            </View>
            <Text color="textMedium">
              La solicitud está cerrada. Si aceptaste una oferta antes de cancelarla,
              puedes revisar su seguimiento y abrir el chat. El historial se
              conservará durante el período de privacidad y luego se eliminará
              automáticamente.
            </Text>
          </View>
        ) : null}

        <GroupedListSection title="Categoría">
          <GroupedListRow
            icon="tag"
            label={purchaseRequest.category_name ?? "Sin categoría"}
            description="Ver cómo Luppit usa esta categoría"
            showSeparator={false}
            onPress={openCategoryInfo}
          />
        </GroupedListSection>

        <View style={s.offersSection}>
          <View
            style={[
              s.offerHeader,
              isAcceptedRequest ? s.offerHeaderAccepted : null,
            ]}
          >
            <Text color="textMedium" variant="small" style={s.offerHeaderTitle}>
              {isCanceledRequest
                ? "Compra cerrada"
                : isAcceptedRequest
                  ? "Oferta seleccionada"
                  : `Ofertas (${offersCount}):`}
            </Text>
            {!isAcceptedRequest && !isCanceledRequest ? (
              <View style={s.offerHeaderActions}>
                <Pressable
                  hitSlop={10}
                  onPress={openFiltersPopup}
                  accessibilityRole="button"
                  accessibilityLabel="Filtrar ofertas"
                  style={s.offerIconButton}
                >
                  <Icon
                    name="sliders-horizontal"
                    size={18}
                    color={t.colors.stateAnulated}
                  />
                </Pressable>
                <Pressable
                  hitSlop={10}
                  onPress={openSortPopup}
                  accessibilityRole="button"
                  accessibilityLabel="Ordenar ofertas"
                  style={s.offerIconButton}
                >
                  <Icon
                    name="arrow-up-down"
                    size={18}
                    color={t.colors.stateAnulated}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>

          {!isAcceptedRequest && !isCanceledRequest && (hasActiveFilters || hasCustomSort) ? (
            <View style={s.activeChipsRow}>
              {hasActiveFilters ? (
                <LuppitChip
                  icon="sliders-horizontal"
                  label={`Filtros (${activeFilterCount})`}
                  onRemove={() => setFilters(EMPTY_BUYER_OFFER_FILTERS)}
                  removeAccessibilityLabel="Limpiar filtros"
                />
              ) : null}

              {hasCustomSort ? (
                <LuppitChip
                  icon="arrow-up-down"
                  label={getBuyerOfferSortLabel(selectedSortId)}
                  onRemove={() => setSelectedSortId(DEFAULT_BUYER_OFFER_SORT_ID)}
                  removeAccessibilityLabel="Restablecer orden"
                />
              ) : null}
            </View>
          ) : null}

          {offersLoading ? (
            <LoadingState
              label="Cargando ofertas..."
              variant="inline"
              style={s.inlineLoading}
            />
          ) : displayedOffersCount === 0 ? (
            <View style={s.emptyOffers}>
              <View style={s.emptyOffersIconBadge}>
                <Icon name={emptyOffersState.icon} size={24} color={t.colors.primary} />
              </View>
              <Text variant="body" align="center" style={s.emptyOffersTitle}>
                {emptyOffersState.title}
              </Text>
              <Text
                variant="small"
                color="stateAnulated"
                align="center"
                style={s.emptyOffersDescription}
              >
                {emptyOffersState.description}
              </Text>
            </View>
          ) : (
            <View style={s.offersList}>
              {displayedOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  connectLabel={isTrackedRequest ? "Ver chat" : "Ver conversación"}
                  timeline={
                    isTrackedRequest &&
                    (offer.id === selectedOfferId || (!selectedOfferId && offers.length === 1))
                      ? selectedOfferTimeline
                      : undefined
                  }
                  timelineLoading={isTrackedRequest && selectedOfferLoading}
                  timelineError={
                    isTrackedRequest &&
                    (offer.id === selectedOfferId || (!selectedOfferId && offers.length === 1))
                      ? selectedOfferTimelineError
                      : null
                  }
                  onTimelineRetry={
                    isTrackedRequest ? () => setTimelineReloadKey((value) => value + 1) : undefined
                  }
                  onMenuPress={() => openOfferMenu(offer)}
                  onConnect={() => void openOfferConversation(offer.id)}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function createPurchaseRequestDetailStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: topContentInset,
      paddingHorizontal: t.spacing.lg,
    },
    content: {
      paddingTop: topContentInset + t.spacing.md,
      paddingBottom: t.spacing.xl,
    },
    body: {
      flex: 1,
      gap: t.spacing.lg,
    },
    summaryCard: {
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    viewsRow: {
      alignSelf: "flex-end",
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    canceledCard: {
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      gap: t.spacing.sm,
    },
    statusTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    canceledTitle: {
      color: t.colors.stateCanceled,
    },
    offersSection: {
      gap: t.spacing.md,
    },
    offerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    offerHeaderAccepted: {
      justifyContent: "flex-start",
    },
    offerHeaderTitle: {
      flex: 1,
    },
    offerHeaderActions: {
      flexDirection: "row",
      gap: t.spacing.sm,
    },
    offerIconButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    activeChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    closedOffersMessage: {
      marginTop: t.spacing.sm,
    },
    inlineLoading: {
      marginTop: t.spacing.sm,
    },
    emptyOffers: {
      ...createRoundedSurfaceStyle(t),
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      minHeight: 164,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.lg,
    },
    emptyOffersIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
      marginBottom: t.spacing.xs,
    },
    emptyOffersTitle: {
      color: t.colors.textDark,
    },
    emptyOffersDescription: {
      maxWidth: 280,
    },
    offersList: {
      gap: t.spacing.md,
    },
  });
}
