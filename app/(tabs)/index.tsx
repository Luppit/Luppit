import { Icon } from "@/src/components/Icon";
import Button from "@/src/components/button/Button";
import LoadingState from "@/src/components/loading/LoadingState";
import MarketplaceRequestCard from "@/src/components/marketplaceHub/MarketplaceRequestCard";
import { openPurchaseRequestCardMenu } from "@/src/components/marketplaceHub/openPurchaseRequestCardMenu";
import usePurchaseRequestFavorites from "@/src/components/marketplaceHub/usePurchaseRequestFavorites";
import RoleGate from "@/src/components/role/RoleGate";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  BuyerHomeFilters,
  getBuyerHomeFilters,
  hasBuyerHomeFilters,
  subscribeBuyerHomeFilters,
} from "@/src/services/buyer.home.filters.service";
import { getOrCreateCurrentSellerConversationByPurchaseRequestId } from "@/src/services/conversation.service";
import {
  getCurrentProfileEmailSetupStatus,
  ProfileEmailSetupStatus,
} from "@/src/services/profile.service";
import {
  getCurrentBuyerMarketplaceHub,
  getCurrentSellerMarketplaceHub,
  MarketplaceHub,
  MarketplaceHubItem,
  MarketplaceHubRole,
  MarketplaceHubStage,
} from "@/src/services/purchase.request.service";
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
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { Asset } from "expo-asset";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SvgUri } from "react-native-svg";

const BUYER_DEFAULT_STAGE = "all";
const SELLER_DEFAULT_STAGE = "for_you";

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
  const profileHeight = t.typography.subtitle.lineHeight;
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

function openHubListing({
  role,
  stage,
  segmentSvgName,
  filters,
  fallbackTitle,
}: {
  role: MarketplaceHubRole;
  stage: MarketplaceHubStage | null;
  segmentSvgName: string;
  filters: BuyerHomeFilters | SellerHomeFilters;
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
      ...(stage?.description ? { description: stage.description } : {}),
    },
  });
}

function BuyerHomeContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [emailSetupStatus, setEmailSetupStatus] = useState<ProfileEmailSetupStatus | null>(null);
  const [hub, setHub] = useState<MarketplaceHub | null>(null);
  const [filters, setFilters] = useState<BuyerHomeFilters>(getBuyerHomeFilters());
  const [selectedStageCode, setSelectedStageCode] = useState(BUYER_DEFAULT_STAGE);
  const [selectedSegmentSvgName, setSelectedSegmentSvgName] = useState(
    getSelectedSegmentSvgName()
  );

  const loadHub = useCallback(async () => {
    setIsLoading(true);
    const emailSetupResult = await getCurrentProfileEmailSetupStatus();
    if (!emailSetupResult.ok) {
      setEmailSetupStatus(null);
      setHub(null);
      setIsLoading(false);
      return;
    }

    setEmailSetupStatus(emailSetupResult.data);
    if (!emailSetupResult.data.isComplete) {
      setHub(null);
      setIsLoading(false);
      return;
    }

    const result = await getCurrentBuyerMarketplaceHub(
      filters,
      selectedSegmentSvgName,
      selectedStageCode
    );
    setHub(result.ok ? result.data : null);
    setIsLoading(false);
  }, [filters, selectedSegmentSvgName, selectedStageCode]);

  useEffect(() => subscribeBuyerHomeFilters(setFilters), []);
  useEffect(() => subscribeSelectedSegment(setSelectedSegmentSvgName), []);

  useFocusEffect(
    useCallback(() => {
      void loadHub();
      return () => {};
    }, [loadHub])
  );

  return (
    <MarketplaceHomeContent
      role="buyer"
      isLoading={isLoading}
      emailSetupStatus={emailSetupStatus}
      hub={hub}
      filters={filters}
      selectedStageCode={selectedStageCode}
      selectedSegmentSvgName={selectedSegmentSvgName}
      hasFilterChip={hasBuyerHomeFilters(filters)}
      hasActiveFilters={
        hasBuyerHomeFilters(filters) || selectedSegmentSvgName !== ALL_SEGMENTS_SVG_NAME
      }
      onSelectStage={setSelectedStageCode}
    />
  );
}

function SellerHomeContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [emailSetupStatus, setEmailSetupStatus] = useState<ProfileEmailSetupStatus | null>(null);
  const [hub, setHub] = useState<MarketplaceHub | null>(null);
  const [filters, setFilters] = useState<SellerHomeFilters>(getSellerHomeFilters());
  const [selectedStageCode, setSelectedStageCode] = useState(SELLER_DEFAULT_STAGE);
  const [selectedSegmentSvgName, setSelectedSegmentSvgName] = useState(
    getSelectedSegmentSvgName()
  );

  const loadHub = useCallback(async () => {
    setIsLoading(true);
    const emailSetupResult = await getCurrentProfileEmailSetupStatus();
    if (!emailSetupResult.ok) {
      setEmailSetupStatus(null);
      setHub(null);
      setIsLoading(false);
      return;
    }

    setEmailSetupStatus(emailSetupResult.data);
    if (!emailSetupResult.data.isComplete) {
      setHub(null);
      setIsLoading(false);
      return;
    }

    const result = await getCurrentSellerMarketplaceHub(
      filters,
      selectedSegmentSvgName,
      selectedStageCode
    );
    setHub(result.ok ? result.data : null);
    setIsLoading(false);
  }, [filters, selectedSegmentSvgName, selectedStageCode]);

  useEffect(() => subscribeSellerHomeFilters(setFilters), []);
  useEffect(() => subscribeSelectedSegment(setSelectedSegmentSvgName), []);

  useFocusEffect(
    useCallback(() => {
      void loadHub();
      return () => {};
    }, [loadHub])
  );

  return (
    <MarketplaceHomeContent
      role="seller"
      isLoading={isLoading}
      emailSetupStatus={emailSetupStatus}
      hub={hub}
      filters={filters}
      selectedStageCode={selectedStageCode}
      selectedSegmentSvgName={selectedSegmentSvgName}
      hasFilterChip={hasSellerHomeFilters(filters)}
      hasActiveFilters={
        hasSellerHomeFilters(filters) || selectedSegmentSvgName !== ALL_SEGMENTS_SVG_NAME
      }
      onSelectStage={setSelectedStageCode}
    />
  );
}

function MarketplaceHomeContent({
  role,
  isLoading,
  emailSetupStatus,
  hub,
  filters,
  selectedStageCode,
  selectedSegmentSvgName,
  hasFilterChip,
  hasActiveFilters,
  onSelectStage,
}: {
  role: MarketplaceHubRole;
  isLoading: boolean;
  emailSetupStatus: ProfileEmailSetupStatus | null;
  hub: MarketplaceHub | null;
  filters: BuyerHomeFilters | SellerHomeFilters;
  selectedStageCode: string;
  selectedSegmentSvgName: string;
  hasFilterChip: boolean;
  hasActiveFilters: boolean;
  onSelectStage: (stageCode: string) => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);
  const { favoriteIds, toggle: toggleFavorite } = usePurchaseRequestFavorites(role);
  const stageScrollRef = useRef<ScrollView | null>(null);
  const emptyBoxAsset = Asset.fromModule(require("../../assets/images/empty_box.svg"));
  const topContentInset = useMemo(
    () => getHomeTopContentInset(t, hasFilterChip),
    [hasFilterChip, t]
  );
  const selectedStage =
    hub?.stages.find((stage) => stage.code === selectedStageCode) ?? hub?.stages[0] ?? null;
  const items = hub?.rail.items ?? [];
  const attentionCount = hub?.overview.attention_request_count ?? 0;
  const unreadConversationCount = hub?.overview.unread_conversation_count ?? 0;
  const unreadMessageCount = hub?.overview.unread_message_count ?? 0;
  const activeRequestCount = hub?.overview.active_request_count ?? 0;
  const orderedStages = useMemo(() => {
    const stages = hub?.stages ?? [];
    const selected = stages.find((stage) => stage.code === selectedStageCode);
    if (!selected) return stages;

    return [selected, ...stages.filter((stage) => stage.code !== selectedStageCode)];
  }, [hub?.stages, selectedStageCode]);

  useEffect(() => {
    if (!hub || hub.stages.some((stage) => stage.code === selectedStageCode)) return;
    onSelectStage(role === "buyer" ? BUYER_DEFAULT_STAGE : SELLER_DEFAULT_STAGE);
  }, [hub, onSelectStage, role, selectedStageCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      stageScrollRef.current?.scrollTo({ x: 0, animated: true });
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedStageCode]);

  if (isLoading) {
    return <LoadingState label="Cargando solicitudes..." />;
  }

  if (emailSetupStatus && !emailSetupStatus.isComplete) {
    return <AccountSetupRequiredState topContentInset={topContentInset} />;
  }

  if (!hub || (hub.stages.length === 0 && items.length === 0)) {
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
      />
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
          Resumen
        </Text>
        <Text variant="subtitle">
          {activeRequestCount}{" "}
          {role === "buyer"
            ? activeRequestCount === 1
              ? "solicitud en movimiento"
              : "solicitudes en movimiento"
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
              ? "No tienes acciones pendientes."
              : "No tienes negociaciones pendientes."}
        </Text>
      </View>

      {attentionCount > 0 ? (
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
              fallbackTitle: "Necesitan tu atención",
            })
          }
        />
      ) : null}

      {unreadConversationCount > 0 ? (
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

      <ScrollView
        ref={stageScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.stageListContent}
      >
        {orderedStages.map((stage) => {
          const isSelected = stage.code === selectedStageCode;

          return (
            <Pressable
              key={stage.code}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelectStage(stage.code)}
              style={[s.stageChip, isSelected ? s.stageChipSelected : null]}
            >
              <Text
                variant="small"
                style={isSelected ? s.stageChipTextSelected : s.stageChipText}
              >
                {stage.name}
              </Text>
              <View style={[s.stageCountBadge, isSelected ? s.stageCountBadgeSelected : null]}>
                <Text
                  variant="small"
                  style={isSelected ? s.stageCountTextSelected : s.stageCountText}
                >
                  {stage.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={s.railSection}>
        <View style={s.railHeader}>
          <View style={s.railHeaderTop}>
            <Text variant="body" style={s.railTitle}>
              {hub.rail.title}
            </Text>
            {hub.rail.total > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  openHubListing({
                    role,
                    stage: selectedStage,
                    segmentSvgName: selectedSegmentSvgName,
                    filters,
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
          {selectedStage?.description ? (
            <Text variant="small" color="textMedium" style={s.railDescription}>
              {selectedStage.description}
            </Text>
          ) : null}
        </View>

        {items.length > 0 ? (
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
          <View style={s.inlineEmptyState}>
            {emptyBoxAsset?.uri ? (
              <SvgUri uri={emptyBoxAsset.uri} width={170} height={140} />
            ) : (
              <Image
                source={require("../../assets/images/icon.png")}
                style={s.inlineEmptyFallbackImage}
                resizeMode="contain"
              />
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function HomeShortcut({
  icon,
  title,
  description,
  onPress,
}: {
  icon: "alert-circle" | "message-circle";
  title: string;
  description: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.shortcut, pressed ? s.shortcutPressed : null]}
    >
      <View style={s.shortcutContent}>
        <View style={s.shortcutIcon}>
          <Icon name={icon} size={20} color={t.colors.primary} />
        </View>
        <View style={s.shortcutText}>
          <Text variant="body" maxLines={1} style={s.shortcutTitle}>
            {title}
          </Text>
          <Text variant="body" color="stateAnulated" maxLines={1}>
            {description}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={t.colors.stateAnulated} />
      </View>
    </Pressable>
  );
}

function AccountSetupRequiredState({ topContentInset }: { topContentInset: number }) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);
  const emptyBoxAsset = Asset.fromModule(require("../../assets/images/empty_box.svg"));

  return (
    <View
      style={[s.stateContent, { paddingTop: topContentInset }]}
    >
      {emptyBoxAsset?.uri ? (
        <SvgUri uri={emptyBoxAsset.uri} width={240} height={220} />
      ) : (
        <Image
          source={require("../../assets/images/icon.png")}
          style={s.stateFallbackImage}
          resizeMode="contain"
        />
      )}
      <Text align="center" variant="body">
        Necesitas terminar la configuración de tu cuenta. Agrega tu correo y autoriza recibir
        emails de Luppit para continuar.
      </Text>
      <View style={s.stateAction}>
        <Button
          variant="dark"
          title="Completar configuración"
          onPress={() =>
            router.push({
              pathname: "/(modal)/email-setup",
              params: { title: "Verificar correo" },
            })
          }
        />
      </View>
    </View>
  );
}

function HomeEmptyState({
  topContentInset,
  message,
}: {
  topContentInset: number;
  message: string;
}) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceHomeStyles(t), [t]);
  const emptyBoxAsset = Asset.fromModule(require("../../assets/images/empty_box.svg"));

  return (
    <View
      style={[s.stateContent, { paddingTop: topContentInset }]}
    >
      {emptyBoxAsset?.uri ? (
        <SvgUri uri={emptyBoxAsset.uri} width={240} height={220} />
      ) : (
        <Image
          source={require("../../assets/images/icon.png")}
          style={s.stateFallbackImage}
          resizeMode="contain"
        />
      )}
      <Text align="center" variant="body">
        {message}
      </Text>
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
    stageListContent: {
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    stageChip: {
      ...createRoundedSurfaceStyle(t),
      minHeight: 40,
      borderRadius: 999,
      paddingLeft: t.spacing.md,
      paddingRight: t.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    stageChipSelected: {
      backgroundColor: t.colors.textDark,
    },
    stageChipText: {
      color: t.colors.textDark,
    },
    stageChipTextSelected: {
      color: t.colors.backgroudWhite,
    },
    stageCountBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.background,
    },
    stageCountBadgeSelected: {
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    stageCountText: {
      color: t.colors.textMedium,
    },
    stageCountTextSelected: {
      color: t.colors.backgroudWhite,
    },
    railSection: {
      gap: t.spacing.md,
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
      minHeight: 156,
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: t.spacing.md,
      ...createRoundedSurfaceStyle(t),
    },
    inlineEmptyFallbackImage: {
      width: 72,
      height: 72,
    },
    shortcut: {
      marginHorizontal: t.spacing.md,
      ...createRoundedSurfaceStyle(t),
    },
    shortcutPressed: {
      opacity: 0.78,
    },
    shortcutContent: {
      minHeight: 72,
      padding: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    shortcutIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
    },
    shortcutText: {
      flex: 1,
      gap: 2,
    },
    shortcutTitle: {
      color: t.colors.textDark,
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
  });
}
