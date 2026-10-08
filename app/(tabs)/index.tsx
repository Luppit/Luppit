import { Icon } from "@/src/components/Icon";
import Button from "@/src/components/button/Button";
import PendingRatingsEntry from "@/src/components/conversation/PendingRatingsEntry";
import { BundledSvg } from "@/src/components/BundledSvg";
import LuppitChip from "@/src/components/chip/LuppitChip";
import LoadingState from "@/src/components/loading/LoadingState";
import SellerBusinessSetupChecklist from "@/src/components/marketplaceHub/SellerBusinessSetupChecklist";
import HomeShortcut from "@/src/components/marketplaceHub/HomeShortcut";
import MarketplaceRequestCard from "@/src/components/marketplaceHub/MarketplaceRequestCard";
import { openPurchaseRequestCardMenu } from "@/src/components/marketplaceHub/openPurchaseRequestCardMenu";
import { openSellerRequest } from "@/src/components/marketplaceHub/openSellerRequest";
import usePurchaseRequestFavorites from "@/src/components/marketplaceHub/usePurchaseRequestFavorites";
import { usePushNotifications } from "@/src/components/notifications/PushNotificationProvider";
import RoleGate from "@/src/components/role/RoleGate";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  BuyerHomeFilters,
  getBuyerHomeFilters,
  hasBuyerHomeFilters,
  subscribeBuyerHomeFilters,
} from "@/src/services/buyer.home.filters.service";
import {
  getCurrentProfileEmailSetupStatus,
} from "@/src/services/profile.service";
import {
  DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE,
  getCurrentBuyerMarketplaceHub,
  getCurrentSellerMarketplaceHub,
  MarketplaceHub,
  MarketplaceHubItem,
  MarketplaceHubRole,
  MarketplaceHubStage,
} from "@/src/services/purchase.request.service";
import { getCurrentSellerBusinessSetup, SellerBusinessSetup } from "@/src/services/seller.business.setup.service";
import { openPopup } from "@/src/services/popup.service";
import {
  getSellerHomeFilters,
  hasSellerHomeFilters,
  SellerHomeFilters,
  subscribeSellerHomeFilters,
} from "@/src/services/seller.home.filters.service";
import {
  ALL_SEGMENTS_SVG_NAME,
  getSelectedSegmentSvgName,
  subscribeSelectedSegment,
} from "@/src/services/segment.service";
import { type Theme, useTheme } from "@/src/themes";
import { openSignOutConfirmation } from "@/src/utils/openSignOutConfirmation";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

const BUYER_DEFAULT_STAGE = "all";
const SELLER_DEFAULT_STAGE = "for_you";
type AccountSetupRequirement = "email";

export default function HomeScreen() {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);

  return (
    <View style={s.screen}>
      <RoleGate
        loading={<LoadingState label="Cargando contenido..." />}
        buyer={<BuyerHomeContent />}
        seller={<SellerHomeContent />}
      />
    </View>
  );
}

function getHomeTopContentInset(t: Theme, hasFilterChip: boolean) {
  const profileHeight =
    t.typography.subtitle.lineHeight +
    t.spacing.sm +
    t.typography.small.lineHeight;
  const searchHeight = 48;
  const segmentHeight = 58;
  const headerHeight =
    t.spacing.lg +
    profileHeight +
    t.spacing.md +
    searchHeight +
    t.spacing.md +
    segmentHeight +
    t.spacing.md;
  const filterChipHeight = hasFilterChip ? 36 + t.spacing.md : 0;

  return headerHeight + filterChipHeight + t.spacing.md;
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

function openHubListing({
  role,
  stage,
  segmentSvgName,
  filters,
  sortCode,
  fallbackTitle,
}: {
  role: MarketplaceHubRole;
  stage: MarketplaceHubStage | null;
  segmentSvgName: string;
  filters: BuyerHomeFilters | SellerHomeFilters;
  sortCode?: string;
  fallbackTitle?: string;
}) {
  const stageCode = stage?.code ?? (role === "buyer" ? BUYER_DEFAULT_STAGE : SELLER_DEFAULT_STAGE);

  router.push({
    pathname: "/(detail)/marketplace-hub-section",
    params: {
      title: fallbackTitle ?? stage?.name ?? (role === "buyer" ? "Tus solicitudes" : "Para ti"),
      hideMenu: "true",
      role,
      stageCode,
      segmentSvgName,
      filters: JSON.stringify(filters),
      ...(sortCode ? { sortCode } : {}),
      ...(stage?.description ? { description: stage.description } : {}),
    },
  });
}

function getRailEmptyMessage({
  role,
  selectedStage,
  hasActiveFilters,
  hasOtherMatches,
  hasRailMatches,
}: {
  role: MarketplaceHubRole;
  selectedStage: MarketplaceHubStage | null;
  hasActiveFilters: boolean;
  hasOtherMatches: boolean;
  hasRailMatches: boolean;
}) {
  if (hasRailMatches) return "Selecciona Ver todas para consultar las solicitudes.";
  if (hasActiveFilters && hasOtherMatches) {
    return "Hay solicitudes que coinciden en otras etapas. Selecciona una etapa con resultados.";
  }
  if (hasActiveFilters) return "No hay resultados para esta etapa.";
  if (selectedStage?.code === "needs_attention") return "Todo está al día por ahora.";
  return role === "buyer"
    ? "No hay solicitudes en esta etapa."
    : "No hay oportunidades en esta etapa.";
}

function getMatchingStageCode(hub: MarketplaceHub, revealMatches: boolean) {
  const selected = hub.stages.find((stage) => stage.is_selected);
  if (revealMatches && hub.rail.total === 0 && hub.rail.items.length === 0) {
    return hub.stages.find((stage) => stage.count > 0)?.code ?? selected?.code;
  }
  return selected?.code;
}

function BuyerHomeContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [setupRequirement, setSetupRequirement] = useState<AccountSetupRequirement | null>(null);
  const [hub, setHub] = useState<MarketplaceHub | null>(null);
  const requestGenerationRef = useRef(0);
  const loadedCriteriaRef = useRef<string | null>(null);
  const [filters, setFilters] = useState<BuyerHomeFilters>(getBuyerHomeFilters());
  const [selectedStageCode, setSelectedStageCode] = useState(BUYER_DEFAULT_STAGE);
  const [selectedSortCode, setSelectedSortCode] = useState(
    DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE
  );
  const [selectedSegmentSvgName, setSelectedSegmentSvgName] = useState(
    getSelectedSegmentSvgName()
  );
  const criteriaKey = JSON.stringify({ filters, selectedSegmentSvgName });
  const hasActiveFilters =
    hasBuyerHomeFilters(filters) || selectedSegmentSvgName !== ALL_SEGMENTS_SVG_NAME;

  const loadHub = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    setIsLoading(true);
    const emailSetupResult = await getCurrentProfileEmailSetupStatus();
    if (generation !== requestGenerationRef.current) return;
    if (!emailSetupResult.ok) {
      setSetupRequirement(null);
      setHub(null);
      setIsLoading(false);
      return;
    }

    if (!emailSetupResult.data.isComplete) {
      setSetupRequirement("email");
      setHub(null);
      setIsLoading(false);
      return;
    }

    setSetupRequirement(null);
    const result = await getCurrentBuyerMarketplaceHub(
      filters,
      selectedSegmentSvgName,
      selectedStageCode,
      selectedSortCode
    );
    if (generation !== requestGenerationRef.current) return;
    if (result.ok) {
      const stageCode = getMatchingStageCode(
        result.data,
        hasActiveFilters && loadedCriteriaRef.current !== criteriaKey
      );
      loadedCriteriaRef.current = criteriaKey;
      if (stageCode && stageCode !== selectedStageCode) {
        setSelectedStageCode(stageCode);
        return;
      }
    }
    setHub(result.ok ? result.data : null);
    setIsLoading(false);
  }, [criteriaKey, filters, hasActiveFilters, selectedSegmentSvgName, selectedSortCode, selectedStageCode]);

  useEffect(
    () =>
      subscribeBuyerHomeFilters((nextFilters) => {
        setFilters(nextFilters);
        if (
          nextFilters.selectedChipIds.some(
            (statusCode) => statusCode.trim().toLowerCase() === "canceled"
          )
        ) {
          setSelectedStageCode(BUYER_DEFAULT_STAGE);
        }
      }),
    []
  );
  useEffect(() => subscribeSelectedSegment(setSelectedSegmentSvgName), []);

  useFocusEffect(
    useCallback(() => {
      void loadHub();
      return () => {
        requestGenerationRef.current += 1;
      };
    }, [loadHub])
  );

  return (
    <MarketplaceHomeContent
      role="buyer"
      isLoading={isLoading}
      setupRequirement={setupRequirement}
      hub={hub}
      filters={filters}
      selectedStageCode={selectedStageCode}
      selectedSortCode={selectedSortCode}
      selectedSegmentSvgName={selectedSegmentSvgName}
      hasFilterChip={hasBuyerHomeFilters(filters)}
      hasActiveFilters={hasActiveFilters}
      onSelectStage={setSelectedStageCode}
      onSelectSort={setSelectedSortCode}
      onRetry={() => void loadHub()}
    />
  );
}

function SellerHomeContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [sellerSetup, setSellerSetup] = useState<SellerBusinessSetup | null>(null);
  const [hub, setHub] = useState<MarketplaceHub | null>(null);
  const requestGenerationRef = useRef(0);
  const loadedCriteriaRef = useRef<string | null>(null);
  const [filters, setFilters] = useState<SellerHomeFilters>(getSellerHomeFilters());
  const [selectedStageCode, setSelectedStageCode] = useState(SELLER_DEFAULT_STAGE);
  const [selectedSegmentSvgName, setSelectedSegmentSvgName] = useState(
    getSelectedSegmentSvgName()
  );
  const criteriaKey = JSON.stringify({ filters, selectedSegmentSvgName });
  const hasActiveFilters =
    hasSellerHomeFilters(filters) || selectedSegmentSvgName !== ALL_SEGMENTS_SVG_NAME;

  const loadHub = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    setIsLoading(true);
    const setupResult = await getCurrentSellerBusinessSetup();
    if (generation !== requestGenerationRef.current) return;
    if (!setupResult.ok) {
      setSellerSetup(null);
      setHub(null);
      setIsLoading(false);
      return;
    }
    setSellerSetup(setupResult.data);
    if (!setupResult.data.isComplete) {
      setHub(null);
      setIsLoading(false);
      return;
    }

    const result = await getCurrentSellerMarketplaceHub(
      filters,
      selectedSegmentSvgName,
      selectedStageCode
    );
    if (generation !== requestGenerationRef.current) return;
    if (result.ok) {
      const stageCode = getMatchingStageCode(
        result.data,
        hasActiveFilters && loadedCriteriaRef.current !== criteriaKey
      );
      loadedCriteriaRef.current = criteriaKey;
      if (stageCode && stageCode !== selectedStageCode) {
        setSelectedStageCode(stageCode);
        return;
      }
    }
    setHub(result.ok ? result.data : null);
    setIsLoading(false);
  }, [criteriaKey, filters, hasActiveFilters, selectedSegmentSvgName, selectedStageCode]);

  useEffect(() => subscribeSellerHomeFilters(setFilters), []);
  useEffect(() => subscribeSelectedSegment(setSelectedSegmentSvgName), []);

  useFocusEffect(
    useCallback(() => {
      void loadHub();
      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") void loadHub();
      });
      return () => {
        subscription.remove();
        requestGenerationRef.current += 1;
      };
    }, [loadHub])
  );

  return (
    <MarketplaceHomeContent
      role="seller"
      isLoading={isLoading}
      setupRequirement={null}
      sellerSetup={sellerSetup}
      hub={hub}
      filters={filters}
      selectedStageCode={selectedStageCode}
      selectedSortCode={null}
      selectedSegmentSvgName={selectedSegmentSvgName}
      hasFilterChip={hasSellerHomeFilters(filters)}
      hasActiveFilters={hasActiveFilters}
      onSelectStage={setSelectedStageCode}
      onSelectSort={undefined}
      onRetry={() => void loadHub()}
    />
  );
}

function MarketplaceHomeContent({
  role,
  isLoading,
  setupRequirement,
  sellerSetup,
  hub,
  filters,
  selectedStageCode,
  selectedSortCode,
  selectedSegmentSvgName,
  hasFilterChip,
  hasActiveFilters,
  onSelectStage,
  onSelectSort,
  onRetry,
}: {
  role: MarketplaceHubRole;
  isLoading: boolean;
  setupRequirement: AccountSetupRequirement | null;
  sellerSetup?: SellerBusinessSetup | null;
  hub: MarketplaceHub | null;
  filters: BuyerHomeFilters | SellerHomeFilters;
  selectedStageCode: string;
  selectedSortCode: string | null;
  selectedSegmentSvgName: string;
  hasFilterChip: boolean;
  hasActiveFilters: boolean;
  onSelectStage: (stageCode: string) => void;
  onSelectSort?: (sortCode: string) => void;
  onRetry: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);
  const { presentInitialPushPermissionPrompt } = usePushNotifications();
  const { favoriteIds, toggle: toggleFavorite } = usePurchaseRequestFavorites(role);
  const { width, fontScale } = useWindowDimensions();
  const stackStageCounts = width < 390 || fontScale > 1;
  const topContentInset = useMemo(
    () => getHomeTopContentInset(t, hasFilterChip),
    [hasFilterChip, t]
  );
  const selectedStage =
    hub?.stages.find((stage) => stage.code === selectedStageCode) ??
    hub?.stages.find((stage) => stage.is_selected) ?? null;
  const items = hub?.rail.items ?? [];
  const hasMatches = Boolean(
    items.length || hub?.rail.total || hub?.stages.some((stage) => stage.count > 0)
  );
  const attentionCount = hub?.overview.attention_request_count ?? 0;
  const unreadConversationCount = hub?.overview.unread_conversation_count ?? 0;
  const unreadMessageCount = hub?.overview.unread_message_count ?? 0;
  const activeRequestCount = hub?.overview.active_request_count ?? 0;
  const sortConfig = role === "buyer" ? hub?.sort ?? null : null;
  const resolvedSortCode =
    selectedSortCode ??
    DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE;
  const defaultSortCode =
    sortConfig?.default_code ?? DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE;
  const selectedSortLabel =
    sortConfig?.options.find((option) => option.code === resolvedSortCode)?.label ??
    "Orden";

  useEffect(() => {
    if (!hub || hub.stages.some((stage) => stage.code === selectedStageCode)) return;
    onSelectStage(role === "buyer" ? BUYER_DEFAULT_STAGE : SELLER_DEFAULT_STAGE);
  }, [hub, onSelectStage, role, selectedStageCode]);

  useEffect(() => {
    if (role !== "buyer" || isLoading || setupRequirement || !hub) return;
    void presentInitialPushPermissionPrompt("home");
  }, [
    hub,
    isLoading,
    presentInitialPushPermissionPrompt,
    role,
    setupRequirement,
  ]);

  const openSortPopup = useCallback(() => {
    if (role !== "buyer" || !sortConfig || !onSelectSort) return;

    openPopup({
      type: "sort",
      title: "Ordenar solicitudes",
      options: sortConfig.options.map((option) => ({
        id: option.code,
        label: option.label,
      })),
      initialSelectedId: resolvedSortCode,
      onSelect: onSelectSort,
    });
  }, [onSelectSort, resolvedSortCode, role, sortConfig]);

  if (isLoading && !hub) {
    return <LoadingState label="Cargando solicitudes..." />;
  }

  if (sellerSetup && !sellerSetup.isComplete) {
    return <SellerBusinessSetupChecklist setup={sellerSetup}
      topContentInset={topContentInset} onRefresh={onRetry} />;
  }

  if (setupRequirement) {
    return (
      <AccountSetupRequiredState
        topContentInset={topContentInset}
      />
    );
  }

  if (!hub) {
    return (
      <HomeEmptyState
        topContentInset={topContentInset}
        message="No pudimos cargar las solicitudes. Intenta de nuevo."
        onRetry={onRetry}
      ><PendingRatingsEntry home /></HomeEmptyState>
    );
  }

  if (hub.stages.length === 0 && !hasMatches) {
    return (
      <HomeEmptyState
        topContentInset={topContentInset}
        message={
          hasActiveFilters
            ? "No encontramos solicitudes con los filtros aplicados."
            : role === "buyer"
              ? "Crea tu primera solicitud y empieza a recibir ofertas."
              : "Aún no hay oportunidades para tus categorías."
        }
      ><PendingRatingsEntry home /></HomeEmptyState>
    );
  }

  const attentionStage = hub.stages.find((stage) => stage.code === "needs_attention") ?? null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.scrollContent, { paddingTop: topContentInset }]}
    >
      <View style={s.summaryBlock}>
        <Text variant="small" color="textMedium">
          {hasActiveFilters && filters.searchValue
            ? `Resultados para “${filters.searchValue}”`
            : hasActiveFilters
              ? "Resultados"
              : "Resumen"}
        </Text>
        {hasActiveFilters ? (
          <Text variant="body" color="textMedium" accessibilityLiveRegion="polite">
            {isLoading
              ? "Actualizando resultados..."
              : `${hub.rail.total} ${hub.rail.total === 1 ? "solicitud" : "solicitudes"} en ${selectedStage?.name ?? hub.rail.title}`}
          </Text>
        ) : (
          <>
            <Text variant="subtitle">
              {activeRequestCount}{" "}
              {role === "buyer"
                ? activeRequestCount === 1
                  ? "solicitud activa"
                  : "solicitudes activas"
                : activeRequestCount === 1
                  ? "oportunidad disponible"
                  : "oportunidades disponibles"}
            </Text>
            <Text variant="body" color="stateAnulated">
              {attentionCount > 0
                ? attentionCount === 1
                  ? "Una necesita atención."
                  : `${attentionCount} necesitan atención.`
                : role === "buyer"
                  ? "No tienes solicitudes que necesiten atención."
                  : "No tienes negociaciones pendientes."}
            </Text>
          </>
        )}
      </View>

      <PendingRatingsEntry home />

      {!hasActiveFilters && attentionCount > 0 ? (
        <HomeShortcut
          icon="alert-circle"
          title={
            attentionCount === 1
              ? "1 solicitud necesita tu atención"
              : `${attentionCount} solicitudes necesitan tu atención`
          }
          description={
            role === "buyer"
              ? "Revisa el próximo paso pendiente."
              : "Responde antes de perder la oportunidad."
          }
          onPress={() =>
            openHubListing({
              role,
              stage: attentionStage,
              segmentSvgName: selectedSegmentSvgName,
              filters,
              sortCode: role === "buyer" ? resolvedSortCode : undefined,
              fallbackTitle: "Necesitan tu atención",
            })
          }
        />
      ) : null}

      {!hasActiveFilters && unreadConversationCount > 0 ? (
        <HomeShortcut
          icon="message-circle"
          title={
            unreadConversationCount === 1
              ? "Tienes una conversación sin leer"
              : `Tienes ${unreadConversationCount} conversaciones sin leer`
          }
          description={`${unreadMessageCount} ${unreadMessageCount === 1 ? "mensaje nuevo" : "mensajes nuevos"}`}
          onPress={() => router.push("/(tabs)/chats")}
        />
      ) : null}

      <View style={s.stageList}>
        {hub.stages.map((stage, index) => (
          <LuppitChip
            key={stage.code}
            label={stage.name}
            count={stage.count}
            selected={stage.code === selectedStage?.code}
            variant="homeStage"
            stacked={stackStageCounts}
            labelMaxLines={0}
            style={index > 0 ? s.stageDivider : undefined}
            accessibilityLabel={`${stage.name}, ${stage.count} ${stage.count === 1 ? "solicitud" : "solicitudes"}`}
            onPress={() => onSelectStage(stage.code)}
          />
        ))}
      </View>

      <View style={s.railSection}>
        <View style={s.railHeader}>
          <View style={s.railHeaderTop}>
            <Text variant="body" style={s.railTitle}>
              {isLoading ? selectedStage?.name ?? hub.rail.title : hub.rail.title}
            </Text>
            <View style={s.railHeaderActions}>
              {role === "buyer" && (sortConfig?.options.length ?? 0) > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ordenar tus solicitudes. Orden actual: ${selectedSortLabel}`}
                  onPress={openSortPopup}
                  style={s.sortButton}
                >
                  <Icon name="arrow-up-down" size={22} color={t.colors.textDark} />
                </Pressable>
              ) : null}
              {!isLoading && hub.rail.total > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    openHubListing({
                      role,
                      stage: selectedStage,
                      segmentSvgName: selectedSegmentSvgName,
                      filters,
                      sortCode: role === "buyer" ? resolvedSortCode : undefined,
                      fallbackTitle: hub.rail.title,
                    })
                  }
                  style={s.viewAllLink}
                >
                  <Text variant="small" style={s.viewAllText}>
                    Ver todas
                  </Text>
                  <Icon name="chevron-right" size={16} color={t.colors.textDark} />
                </Pressable>
              ) : null}
            </View>
          </View>
          {selectedStage?.description ? (
            <Text variant="small" color="textMedium" style={s.railDescription}>
              {selectedStage.description}
            </Text>
          ) : null}
          {role === "buyer" && resolvedSortCode !== defaultSortCode ? (
            <LuppitChip
              icon="arrow-up-down"
              label={selectedSortLabel}
              onRemove={() => onSelectSort?.(defaultSortCode)}
              accessibilityLabel={`Cambiar orden. Orden actual: ${selectedSortLabel}`}
              removeAccessibilityLabel="Restablecer orden"
              bordered
              style={s.activeSortChip}
            />
          ) : null}
        </View>

        {isLoading ? (
          <View style={s.railLoading} accessibilityState={{ busy: true }}>
            <LoadingState variant="inline" label="Cargando solicitudes..." />
          </View>
        ) : items.length > 0 ? (
          <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => item.purchase_request_id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.cardRailContent}
            renderItem={({ item }) => (
              <MarketplaceRequestCard
                compact
                item={item}
                role={role}
                showSellerStatus={role === "seller"}
                onPress={() =>
                  role === "buyer" ? openBuyerRequest(item) : void openSellerRequest(item)
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
        ) : (
          <HomeRailEmptyState
            message={getRailEmptyMessage({
              role,
              selectedStage,
              hasActiveFilters,
              hasOtherMatches: hub.stages.some(
                (stage) => stage.code !== selectedStage?.code && stage.count > 0
              ),
              hasRailMatches: hub.rail.total > 0,
            })}
          />
        )}
      </View>
    </ScrollView>
  );
}

function HomeRailEmptyState({ message }: { message: string }) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);

  return (
    <View style={s.inlineEmptyState}>
      <View style={s.inlineEmptyIllustration}>
        <BundledSvg
          asset={require("../../assets/images/empty_box.svg")}
          width={112}
          height={112}
          fallback={
            <Image
              source={require("../../assets/images/icon.png")}
              style={s.inlineEmptyFallbackImage}
              resizeMode="contain"
            />
          }
        />
      </View>
      <Text variant="small" color="stateAnulated" align="center" style={s.inlineEmptyText}>
        {message}
      </Text>
    </View>
  );
}

function AccountSetupRequiredState({
  topContentInset,
}: {
  topContentInset: number;
}) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);

  return (
    <View
      style={[s.stateContent, { paddingTop: topContentInset }]}
    >
      <BundledSvg
        asset={require("../../assets/images/empty_box.svg")}
        width={240}
        height={220}
        fallback={
          <Image
            source={require("../../assets/images/icon.png")}
            style={s.stateFallbackImage}
            resizeMode="contain"
          />
        }
      />
      <Text align="center" variant="body">
        Necesitas terminar la configuración de tu cuenta. Agrega tu correo y autoriza recibir emails de Luppit para continuar.
      </Text>
      <View style={s.stateAction}>
        <Button
          variant="dark"
          title="Completar configuración"
          onPress={() => router.push({
            pathname: "/(modal)/email-setup",
            params: { title: "Verificar correo" },
          })}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={openSignOutConfirmation}
        style={s.stateSignOut}
      >
        <Text variant="body" color="error">
          Cerrar sesión
        </Text>
      </Pressable>
    </View>
  );
}

function HomeEmptyState({
  topContentInset,
  message,
  onRetry,
  children,
}: {
  topContentInset: number;
  message: string;
  onRetry?: () => void;
  children?: React.ReactNode;
}) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);

  return (
    <View
      style={[s.stateContent, { paddingTop: topContentInset }]}
    >
      {children}
      <BundledSvg
        asset={require("../../assets/images/empty_box.svg")}
        width={240}
        height={220}
        fallback={
          <Image
            source={require("../../assets/images/icon.png")}
            style={s.stateFallbackImage}
            resizeMode="contain"
          />
        }
      />
      <Text align="center" variant="body">
        {message}
      </Text>
      {onRetry ? <Button variant="dark" title="Reintentar" onPress={onRetry} /> : null}
    </View>
  );
}

function createMarketplaceHomeStyles(t: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
      padding: t.spacing.xs,
    },
    scrollContent: {
      paddingBottom: 112,
      gap: t.spacing.lg,
    },
    summaryBlock: {
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.md,
    },
    stageList: {
      flexDirection: "row",
      alignItems: "stretch",
      marginHorizontal: t.spacing.md,
      borderRadius: t.glass.radius.chip,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      overflow: "hidden",
    },
    stageDivider: {
      borderLeftWidth: 1,
      borderLeftColor: t.colors.border,
    },
    railSection: {
      gap: t.spacing.md,
    },
    railLoading: {
      minHeight: 176,
    },
    railHeader: {
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.md,
    },
    railHeaderTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.md,
    },
    railTitle: {
      flex: 1,
    },
    railHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
      flexShrink: 0,
    },
    sortButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    activeSortChip: {
      alignSelf: "flex-start",
      marginTop: t.spacing.xs,
    },
    railDescription: {
      paddingRight: t.spacing.xl,
    },
    viewAllLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      minHeight: 24,
      flexShrink: 0,
    },
    viewAllText: {
      color: t.colors.textDark,
    },
    cardRailContent: {
      gap: t.spacing.md,
      paddingHorizontal: t.spacing.md,
    },
    inlineEmptyState: {
      minHeight: 176,
      justifyContent: "center",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
      marginHorizontal: t.spacing.md,
      ...createRoundedSurfaceStyle(t),
    },
    inlineEmptyIllustration: {
      width: 120,
      height: 112,
      alignItems: "center",
      justifyContent: "center",
    },
    inlineEmptyText: {
      maxWidth: 240,
    },
    inlineEmptyFallbackImage: {
      width: 84,
      height: 84,
    },
    stateContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: t.spacing.md,
      paddingHorizontal: t.spacing.lg,
      paddingBottom: 96,
    },
    stateFallbackImage: {
      width: 84,
      height: 84,
    },
    stateAction: {
      width: "100%",
    },
    stateSignOut: {
      alignSelf: "center",
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
    },
  });
}
