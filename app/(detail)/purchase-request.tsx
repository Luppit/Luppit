import HintModal from "@/src/components/hintModal/HintModal";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import OfferCard, {
  OfferCardTimelineItem,
} from "@/src/components/offerCard/OfferCard";
import { Text } from "@/src/components/Text";
import {
  getAcceptedConversationByPurchaseRequestId,
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
import { useTheme } from "@/src/themes";
import { useFocusEffect } from "@react-navigation/native";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";
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

export default function PurchaseRequestDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [showCategoryHint, setShowCategoryHint] = useState(false);
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
  const offersCount = offers.length;
  const noOffersAsset = Asset.fromModule(
    require("../../assets/images/no_offers_request.svg"),
  );
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
    if (!isAcceptedRequest) return offers;
    if (!selectedOfferId) return [];
    return offers.filter((offer) => offer.id === selectedOfferId);
  }, [isAcceptedRequest, offers, selectedOfferId]);

  const displayedOffersCount = displayedOffers.length;

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
        isAcceptedRequest ? EMPTY_BUYER_OFFER_FILTERS : filters,
        isAcceptedRequest ? DEFAULT_BUYER_OFFER_SORT_ID : selectedSortId
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
  }, [filters, isAcceptedRequest, purchaseRequestId, selectedSortId]);

  useEffect(() => {
    let active = true;

    const loadFilterOptions = async () => {
      if (!purchaseRequestId) {
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
  }, [purchaseRequestId]);

  useEffect(() => {
    let active = true;

    const resolveSelectedOffer = async () => {
      if (!isAcceptedRequest) {
        setSelectedOfferId(null);
        setSelectedOfferTimeline([]);
        setSelectedOfferLoading(false);
        return;
      }

      setSelectedOfferLoading(true);
      const acceptedConversation = await getAcceptedConversationByPurchaseRequestId(
        purchaseRequestId
      );

      if (!active) return;

      if (!acceptedConversation || acceptedConversation.ok === false) {
        setSelectedOfferId(null);
        setSelectedOfferTimeline([]);
        setSelectedOfferLoading(false);
        return;
      }

      const acceptedOfferId = acceptedConversation.data.purchase_offer_id ?? null;
      setSelectedOfferId(acceptedOfferId);

      const timelineResult = await getConversationTimeline(acceptedConversation.data.id);
      if (!active) return;

      if (!timelineResult.ok) {
        setSelectedOfferTimeline([]);
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
          is_completed: step.is_completed,
          is_next: step.is_next,
        } satisfies OfferCardTimelineItem;
      });

      setSelectedOfferTimeline(timeline);
      setSelectedOfferLoading(false);
    };

    void resolveSelectedOffer();
    return () => {
      active = false;
    };
  }, [isAcceptedRequest, purchaseRequestId]);

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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT,
          paddingHorizontal: t.spacing.lg,
        }}
      >
        <Text align="center" color="stateAnulated">
          No encontramos esta solicitud.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT + t.spacing.md,
        paddingBottom: t.spacing.xl,
      }}
    >
      <View style={{ flex: 1 }}>
        <View>
          <Text variant="body">{purchaseRequest.summary_text ?? ""}</Text>
        </View>

        <View
          style={{
            marginTop: t.spacing.lg,
            alignItems: "flex-end",
            flexDirection: "row",
            justifyContent: "flex-end",
            gap: t.spacing.xs,
          }}
        >
          <Text color="stateAnulated">Visualizaciones:</Text>
          <Icon name="eye" size={20} color={t.colors.stateAnulated} />
          <Text color="stateAnulated">{String(viewsCount)}</Text>
        </View>

        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border,
            marginTop: t.spacing.md,
          }}
        />

        <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
          <Text variant="subtitle">Categoría:</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: t.spacing.xs,
            }}
          >
            <Text variant="titleRegular">{purchaseRequest.category_name ?? "-"}</Text>
            <Pressable hitSlop={8} onPress={() => setShowCategoryHint(true)}>
              <Icon name="info" size={18} color={t.colors.primary} />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border,
            marginTop: t.spacing.lg,
          }}
        />

        <View style={{ marginTop: t.spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: isAcceptedRequest ? "flex-start" : "space-between",
            }}
          >
            <Text color="stateAnulated" variant="subtitle">
              {isAcceptedRequest ? "Oferta seleccionada" : `Ofertas (${offersCount}):`}
            </Text>
            {!isAcceptedRequest ? (
              <View style={{ flexDirection: "row", gap: t.spacing.sm }}>
                <Pressable
                  hitSlop={10}
                  onPress={openFiltersPopup}
                  accessibilityRole="button"
                  accessibilityLabel="Filtrar ofertas"
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

          {!isAcceptedRequest && (hasActiveFilters || hasCustomSort) ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: t.spacing.sm,
                marginTop: t.spacing.md,
              }}
            >
              {hasActiveFilters ? (
                <View
                  style={{
                    maxWidth: "100%",
                    minHeight: 36,
                    borderRadius: 999,
                    ...t.glass.chip,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: t.spacing.xs,
                    paddingLeft: t.spacing.sm,
                    paddingRight: t.spacing.xs,
                  }}
                >
                  <Icon name="sliders-horizontal" size={16} color={t.colors.textDark} />
                  <Text
                    variant="body"
                    style={{ color: t.colors.textDark, flexShrink: 1 }}
                  >
                    Filtros ({activeFilterCount})
                  </Text>
                  <Pressable
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => setFilters(EMPTY_BUYER_OFFER_FILTERS)}
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar filtros"
                  >
                    <Icon name="x" size={16} color={t.colors.textDark} />
                  </Pressable>
                </View>
              ) : null}

              {hasCustomSort ? (
                <View
                  style={{
                    maxWidth: "100%",
                    minHeight: 36,
                    borderRadius: 999,
                    ...t.glass.chip,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: t.spacing.xs,
                    paddingLeft: t.spacing.sm,
                    paddingRight: t.spacing.xs,
                  }}
                >
                  <Icon name="arrow-up-down" size={16} color={t.colors.textDark} />
                  <Text
                    variant="body"
                    maxLines={1}
                    style={{ color: t.colors.textDark, flexShrink: 1 }}
                  >
                    {getBuyerOfferSortLabel(selectedSortId)}
                  </Text>
                  <Pressable
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onPress={() => setSelectedSortId(DEFAULT_BUYER_OFFER_SORT_ID)}
                    accessibilityRole="button"
                    accessibilityLabel="Restablecer orden"
                  >
                    <Icon name="x" size={16} color={t.colors.textDark} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          {offersLoading ? (
            <LoadingState
              label="Cargando ofertas..."
              variant="inline"
              style={{ marginTop: t.spacing.lg }}
            />
          ) : isAcceptedRequest && selectedOfferLoading ? (
            <LoadingState
              label="Cargando oferta seleccionada..."
              variant="inline"
              style={{ marginTop: t.spacing.lg }}
            />
          ) : displayedOffersCount === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                marginTop: t.spacing.xl,
                gap: t.spacing.md,
              }}
            >
              <Text color="stateAnulated" align="center">
                {isAcceptedRequest
                  ? "No se encontró la oferta seleccionada para esta solicitud."
                  : hasActiveFilters
                    ? "No encontramos ofertas con los filtros aplicados."
                    : "Cuando recibas una oferta, aparecerá aquí."}
              </Text>
              {!hasActiveFilters || isAcceptedRequest ? (
                noOffersAsset?.uri ? (
                  <SvgUri uri={noOffersAsset.uri} width={260} height={340} />
                ) : (
                  <Image
                    source={require("../../assets/images/no_offers_request.svg")}
                    style={{ width: 260, height: 340 }}
                    contentFit="contain"
                  />
                )
              ) : null}
            </View>
          ) : (
            <View style={{ marginTop: t.spacing.lg, gap: t.spacing.md }}>
              {displayedOffers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  connectLabel={isAcceptedRequest ? "Ver chat" : "Ver conversación"}
                  timeline={
                    isAcceptedRequest && offer.id === selectedOfferId
                      ? selectedOfferTimeline
                      : undefined
                  }
                  onConnect={() => void openOfferConversation(offer.id)}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <HintModal
        visible={showCategoryHint}
        text={purchaseRequest.category_path ?? "-"}
        onClose={() => setShowCategoryHint(false)}
      />
    </ScrollView>
  );
}
