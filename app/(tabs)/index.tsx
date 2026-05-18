import { Icon } from "@/src/components/Icon";
import Button from "@/src/components/button/Button";
import GlassSurface from "@/src/components/glass/GlassSurface";
import LoadingState from "@/src/components/loading/LoadingState";
import ProductCard from "@/src/components/productCard/ProductCard";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import {
  getCurrentProfileEmailSetupStatus,
  ProfileEmailSetupStatus,
} from "@/src/services/profile.service";
import {
  BuyerHomeFilters,
  getBuyerHomeFilters,
  hasBuyerHomeFilters,
  subscribeBuyerHomeFilters,
} from "@/src/services/buyer.home.filters.service";
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
import { getOrCreateCurrentSellerConversationByPurchaseRequestId } from "@/src/services/conversation.service";
import { getPurchaseOffersCountByPurchaseRequestIds } from "@/src/services/purchase.offer.service";
import { openPopup } from "@/src/services/popup.service";
import {
  addCurrentBuyerPurchaseRequestFavorite,
  addCurrentSellerPurchaseRequestFavorite,
  BuyerHomePurchaseRequestGroup,
  BuyerHomePurchaseRequestItem,
  getCurrentBuyerHomePurchaseRequestGroups,
  getCurrentBuyerPurchaseRequestFavorites,
  getCurrentSellerHomePurchaseRequestGroups,
  getCurrentSellerPurchaseRequestFavorites,
  removeCurrentBuyerPurchaseRequestFavorite,
  removeCurrentSellerPurchaseRequestFavorite,
  SellerHomePurchaseRequestGroup,
  SellerHomePurchaseRequestItem,
} from "@/src/services/purchase.request.service";
import { registerPurchaseRequestVisualization } from "@/src/services/purchase.request.visualization.service";
import { type Theme, useTheme } from "@/src/themes";
import { showError, showInfo, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { Asset } from "expo-asset";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";

export default function HomeScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, padding: t.spacing.xs }}>
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

function BuyerHomeContent() {
  const t = useTheme();
  const emptyBoxAsset = Asset.fromModule(require("../../assets/images/empty_box.svg"));
  const [isLoading, setIsLoading] = useState(true);
  const [emailSetupStatus, setEmailSetupStatus] = useState<ProfileEmailSetupStatus | null>(null);
  const [groups, setGroups] = useState<BuyerHomePurchaseRequestGroup[]>([]);
  const [offerCountsByRequestId, setOfferCountsByRequestId] = useState<Record<string, number>>({});
  const [favoriteRequestIds, setFavoriteRequestIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<BuyerHomeFilters>(getBuyerHomeFilters());
  const [selectedSegmentSvgName, setSelectedSegmentSvgName] = useState(
    getSelectedSegmentSvgName()
  );
  const fullBleedOffset = t.spacing.md + t.spacing.xs;

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    const emailSetupResult = await getCurrentProfileEmailSetupStatus();
    if (!emailSetupResult.ok) {
      setEmailSetupStatus(null);
      setGroups([]);
      setOfferCountsByRequestId({});
      setFavoriteRequestIds(new Set());
      setIsLoading(false);
      return;
    }

    setEmailSetupStatus(emailSetupResult.data);
    if (!emailSetupResult.data.isComplete) {
      setGroups([]);
      setOfferCountsByRequestId({});
      setFavoriteRequestIds(new Set());
      setIsLoading(false);
      return;
    }

    const result = await getCurrentBuyerHomePurchaseRequestGroups(
      filters,
      selectedSegmentSvgName
    );
    const nextGroups = result.ok ? result.data : [];
    setGroups(nextGroups);

    const requestIds = nextGroups.flatMap((group) => group.items.map((item) => item.id));
    const countsResult = await getPurchaseOffersCountByPurchaseRequestIds(requestIds);
    setOfferCountsByRequestId(countsResult.ok ? countsResult.data : {});

    const favoritesResult = await getCurrentBuyerPurchaseRequestFavorites();
    if (favoritesResult.ok) {
      setFavoriteRequestIds(new Set(favoritesResult.data.map((item) => item.id)));
    } else {
      setFavoriteRequestIds(new Set());
    }
    setIsLoading(false);
  }, [filters, selectedSegmentSvgName]);

  useEffect(() => {
    return subscribeBuyerHomeFilters(setFilters);
  }, []);

  useEffect(() => {
    return subscribeSelectedSegment(setSelectedSegmentSvgName);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGroups();
      return () => {};
    }, [loadGroups])
  );

  const hasAnyItems = useMemo(
    () => groups.some((group) => group.items.length > 0),
    [groups]
  );
  const hasActiveFilters = useMemo(
    () =>
      hasBuyerHomeFilters(filters) || selectedSegmentSvgName !== ALL_SEGMENTS_SVG_NAME,
    [filters, selectedSegmentSvgName]
  );
  const topContentInset = useMemo(
    () => getHomeTopContentInset(t, hasBuyerHomeFilters(filters)),
    [filters, t]
  );
  const handleFavoriteChange = useCallback((purchaseRequestId: string, nextIsFavorite: boolean) => {
    setFavoriteRequestIds((current) => {
      const next = new Set(current);
      if (nextIsFavorite) next.add(purchaseRequestId);
      else next.delete(purchaseRequestId);
      return next;
    });
  }, []);

  if (isLoading) {
    return <LoadingState label="Cargando solicitudes..." />;
  }

  if (emailSetupStatus && !emailSetupStatus.isComplete) {
    return <AccountSetupRequiredState topContentInset={topContentInset} />;
  }

  if (!hasAnyItems) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: t.spacing.md,
          paddingTop: topContentInset,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: 96,
        }}
      >
        {emptyBoxAsset?.uri ? (
          <SvgUri uri={emptyBoxAsset.uri} width={240} height={220} />
        ) : (
          <Image
            source={require("../../assets/images/icon.png")}
            style={{ width: 84, height: 84 }}
            resizeMode="contain"
          />
        )}
        <Text align="center" variant="body">
          {hasActiveFilters
            ? "No encontramos solicitudes con los filtros aplicados."
            : "Cuéntanos qué necesitas y te ayudamos a encontrarlo!"}
        </Text>
        {!hasActiveFilters ? (
          <View style={{ width: "100%" }}>
            <Button
              variant="dark"
              icon="plus"
              title="Crear nueva solicitud"
              onPress={() => router.push("/(chat)/chat")}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ marginHorizontal: -fullBleedOffset }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: t.spacing.md,
        paddingTop: topContentInset,
        paddingBottom: t.spacing.xl,
      }}
    >
      {groups.map((group) => (
        <HomeGroupSection
          key={group.code}
          group={group}
          headerInset={fullBleedOffset}
          onOpenGroup={() =>
            router.push({
              pathname: "/(detail)/buyer-home-group",
              params: {
                title: group.name,
                groupCode: group.code,
                segmentSvgName: selectedSegmentSvgName,
              },
            })
          }
          renderItem={(item) => (
            <BuyerHomeRequestCard
              key={item.id}
              item={item}
              offersCount={offerCountsByRequestId[item.id] ?? 0}
              isFavorite={favoriteRequestIds.has(item.id)}
              onFavoriteChange={handleFavoriteChange}
            />
          )}
        />
      ))}
    </ScrollView>
  );
}

function SellerHomeContent() {
  const t = useTheme();
  const emptyBoxAsset = Asset.fromModule(require("../../assets/images/empty_box.svg"));
  const [isLoading, setIsLoading] = useState(true);
  const [emailSetupStatus, setEmailSetupStatus] = useState<ProfileEmailSetupStatus | null>(null);
  const [groups, setGroups] = useState<SellerHomePurchaseRequestGroup[]>([]);
  const [favoriteRequestIds, setFavoriteRequestIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<SellerHomeFilters>(getSellerHomeFilters());
  const [selectedSegmentSvgName, setSelectedSegmentSvgName] = useState(
    getSelectedSegmentSvgName()
  );
  const fullBleedOffset = t.spacing.md + t.spacing.xs;

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    const emailSetupResult = await getCurrentProfileEmailSetupStatus();
    if (!emailSetupResult.ok) {
      setEmailSetupStatus(null);
      setGroups([]);
      setFavoriteRequestIds(new Set());
      setIsLoading(false);
      return;
    }

    setEmailSetupStatus(emailSetupResult.data);
    if (!emailSetupResult.data.isComplete) {
      setGroups([]);
      setFavoriteRequestIds(new Set());
      setIsLoading(false);
      return;
    }

    const result = await getCurrentSellerHomePurchaseRequestGroups(
      filters,
      selectedSegmentSvgName
    );
    setGroups(result.ok ? result.data : []);

    const favoritesResult = await getCurrentSellerPurchaseRequestFavorites();
    if (favoritesResult.ok) {
      setFavoriteRequestIds(new Set(favoritesResult.data.map((item) => item.id)));
    } else {
      setFavoriteRequestIds(new Set());
    }
    setIsLoading(false);
  }, [filters, selectedSegmentSvgName]);

  useEffect(() => {
    return subscribeSellerHomeFilters(setFilters);
  }, []);

  useEffect(() => {
    return subscribeSelectedSegment(setSelectedSegmentSvgName);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGroups();
      return () => {};
    }, [loadGroups])
  );

  const hasAnyItems = useMemo(
    () => groups.some((group) => group.items.length > 0),
    [groups]
  );
  const hasActiveFilters = useMemo(
    () =>
      hasSellerHomeFilters(filters) || selectedSegmentSvgName !== ALL_SEGMENTS_SVG_NAME,
    [filters, selectedSegmentSvgName]
  );
  const topContentInset = useMemo(
    () => getHomeTopContentInset(t, hasSellerHomeFilters(filters)),
    [filters, t]
  );
  const handleFavoriteChange = useCallback((purchaseRequestId: string, nextIsFavorite: boolean) => {
    setFavoriteRequestIds((current) => {
      const next = new Set(current);
      if (nextIsFavorite) next.add(purchaseRequestId);
      else next.delete(purchaseRequestId);
      return next;
    });
  }, []);

  if (isLoading) {
    return <LoadingState label="Cargando solicitudes..." />;
  }

  if (emailSetupStatus && !emailSetupStatus.isComplete) {
    return <AccountSetupRequiredState topContentInset={topContentInset} />;
  }

  if (!hasAnyItems) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: t.spacing.md,
          paddingTop: topContentInset,
          paddingHorizontal: t.spacing.lg,
          paddingBottom: 96,
        }}
      >
        {emptyBoxAsset?.uri ? (
          <SvgUri uri={emptyBoxAsset.uri} width={240} height={220} />
        ) : (
          <Image
            source={require("../../assets/images/icon.png")}
            style={{ width: 84, height: 84 }}
            resizeMode="contain"
          />
        )}
        <Text align="center" variant="body">
          {hasActiveFilters
            ? "No encontramos solicitudes con los filtros aplicados."
            : "Aún no hay solicitudes en ninguna categoría, pero tranquilo: ¡las oportunidades están por llegar!"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ marginHorizontal: -fullBleedOffset }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: t.spacing.md,
        paddingTop: topContentInset,
        paddingBottom: t.spacing.xl,
      }}
    >
      {groups.map((group) => (
        <HomeGroupSection
          key={group.code}
          group={group}
          headerInset={fullBleedOffset}
          onOpenGroup={() =>
            router.push({
              pathname: "/(detail)/seller-home-group",
              params: {
                title: group.name,
                groupCode: group.code,
                segmentSvgName: selectedSegmentSvgName,
              },
            })
          }
          renderItem={(item) => (
            <SellerHomeRequestCard
              key={item.id}
              item={item}
              isFavorite={favoriteRequestIds.has(item.id)}
              onFavoriteChange={handleFavoriteChange}
            />
          )}
        />
      ))}
    </ScrollView>
  );
}

function AccountSetupRequiredState({ topContentInset }: { topContentInset: number }) {
  const t = useTheme();
  const emptyBoxAsset = Asset.fromModule(require("../../assets/images/empty_box.svg"));

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: t.spacing.md,
        paddingTop: topContentInset,
        paddingHorizontal: t.spacing.lg,
        paddingBottom: 96,
      }}
    >
      {emptyBoxAsset?.uri ? (
        <SvgUri uri={emptyBoxAsset.uri} width={240} height={220} />
      ) : (
        <Image
          source={require("../../assets/images/icon.png")}
          style={{ width: 84, height: 84 }}
          resizeMode="contain"
        />
      )}
      <Text align="center" variant="body">
        Necesitas terminar la configuración de tu cuenta. Agrega tu correo y autoriza recibir emails de Luppit para continuar.
      </Text>
      <View style={{ width: "100%" }}>
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

function HomeGroupSection({
  group,
  headerInset,
  onOpenGroup,
  renderItem,
}: {
  group: BuyerHomePurchaseRequestGroup | SellerHomePurchaseRequestGroup;
  headerInset: number;
  onOpenGroup: () => void;
  renderItem: (
    item: BuyerHomePurchaseRequestItem | SellerHomePurchaseRequestItem
  ) => React.ReactNode;
}) {
  const t = useTheme();

  return (
    <View style={{ gap: t.spacing.sm }}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenGroup}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: t.spacing.xs,
          alignSelf: "flex-start",
          paddingHorizontal: headerInset,
        }}
      >
        <Text variant="subtitleRegular">{group.name}</Text>
        <Icon name="arrow-right" size={16} color={t.colors.textDark} />
      </Pressable>

      {group.items.length === 0 ? (
        <View style={{ paddingHorizontal: headerInset }}>
          <Text color="stateAnulated">No hay solicitudes en este grupo.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: t.spacing.md,
            paddingHorizontal: headerInset,
            paddingVertical: t.spacing.sm,
          }}
        >
          {group.items.map((item) => renderItem(item))}
        </ScrollView>
      )}
    </View>
  );
}

function BuyerHomeRequestCard({
  item,
  offersCount,
  isFavorite,
  onFavoriteChange,
}: {
  item: BuyerHomePurchaseRequestItem;
  offersCount: number;
  isFavorite: boolean;
  onFavoriteChange: (purchaseRequestId: string, nextIsFavorite: boolean) => void;
}) {
  const openRequestDetail = useCallback(() => {
    router.push({
      pathname: "/(detail)/purchase-request",
      params: {
        title: item.title ?? "Detalle de solicitud",
        purchaseRequest: JSON.stringify(toPurchaseRequestParam(item)),
      },
    });
  }, [item]);

  const toggleFavorite = useCallback(async () => {
    if (isFavorite) {
      const result = await removeCurrentBuyerPurchaseRequestFavorite(item.id);

      if (!result.ok) {
        showError("No se pudo quitar de favoritos", result.error.message);
        return;
      }

      onFavoriteChange(item.id, false);
      showSuccess(result.data.removed ? "Favorito eliminado" : "Ya no estaba en favoritos");
      return;
    }

    const result = await addCurrentBuyerPurchaseRequestFavorite(item.id);

    if (!result.ok) {
      showError("No se pudo agregar a favoritos", result.error.message);
      return;
    }

    onFavoriteChange(item.id, true);
    showSuccess(result.data.alreadyExists ? "Ya estaba en favoritos" : "Favorito agregado");
  }, [isFavorite, item.id, onFavoriteChange]);

  const openCardOptions = useCallback(() => {
    openPopup({
      options: [
        {
          id: "favorite",
          label: isFavorite ? "Quitar de favoritos" : "Añadir como favorito",
          icon: isFavorite ? "star-off" : "star",
          textColorKey: "textDark",
          iconColorKey: "textDark",
          onPress: () => void toggleFavorite(),
        },
        {
          id: "category-info",
          label: "Información sobre categorías",
          icon: "circle-help",
          textColorKey: "textDark",
          iconColorKey: "textDark",
          onPress: () => showInfo("Categoría", item.category_path ?? "-"),
        },
        {
          id: "share",
          label: "Compartir",
          icon: "share-2",
          textColorKey: "textDark",
          iconColorKey: "textDark",
          onPress: () => console.log("buyer home card popup: share"),
        },
        {
          id: "cancel-request",
          label: "Cancelar solicitud",
          icon: "trash-2",
          textColorKey: "error",
          iconColorKey: "error",
          onPress: () => console.log("buyer home card popup: cancel request"),
        },
      ],
    });
  }, [isFavorite, item.category_path, toggleFavorite]);

  return (
    <View style={{ width: 286 }}>
      <ProductCard
        title={item.title ?? "Solicitud"}
        subtitle={item.category_name ?? "-"}
        views={item.views_count}
        statusLabel={item.status_label ?? item.status}
        offersLabel={
          offersCount <= 0
            ? "Sin ofertas"
            : `${offersCount} ${offersCount === 1 ? "oferta" : "ofertas"}`
        }
        offersCount={offersCount}
        onPress={openRequestDetail}
        onLongPress={openCardOptions}
      />
    </View>
  );
}

function SellerHomeRequestCard({
  item,
  isFavorite,
  onFavoriteChange,
}: {
  item: SellerHomePurchaseRequestItem;
  isFavorite: boolean;
  onFavoriteChange: (purchaseRequestId: string, nextIsFavorite: boolean) => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createSellerHomeRequestCardStyles(t), [t]);
  const publishedLabel = formatPublishedLabel(item.published_at ?? item.created_at);
  const statusLabel = item.status_label?.trim();
  const summaryText = item.summary_text?.trim();
  const categoryName = item.category_name?.trim();
  const offersCount = typeof item.offers_count === "number" ? item.offers_count : null;
  const liftScale = useRef(new Animated.Value(1)).current;
  const liftTranslateY = useRef(new Animated.Value(0)).current;
  const didLongPressRef = useRef(false);

  const settleCard = useCallback(() => {
    Animated.parallel([
      Animated.spring(liftScale, {
        toValue: 1,
        damping: 16,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.spring(liftTranslateY, {
        toValue: 0,
        damping: 16,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [liftScale, liftTranslateY]);

  const liftCard = useCallback(() => {
    didLongPressRef.current = false;
    liftScale.stopAnimation();
    liftTranslateY.stopAnimation();
    Animated.parallel([
      Animated.timing(liftScale, {
        toValue: 1.025,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(liftTranslateY, {
        toValue: -3,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start();
  }, [liftScale, liftTranslateY]);

  const handlePressOut = useCallback(() => {
    if (didLongPressRef.current) return;
    settleCard();
  }, [settleCard]);

  const openRequestConversation = useCallback(async () => {
    await registerPurchaseRequestVisualization(item.id);
    const conversation = await getOrCreateCurrentSellerConversationByPurchaseRequestId(item.id);

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
  }, [item.id, item.title]);

  const toggleFavorite = useCallback(async () => {
    if (isFavorite) {
      const result = await removeCurrentSellerPurchaseRequestFavorite(item.id);

      if (!result.ok) {
        showError("No se pudo quitar de favoritos", result.error.message);
        return;
      }

      onFavoriteChange(item.id, false);
      showSuccess(result.data.removed ? "Favorito eliminado" : "Ya no estaba en favoritos");
      return;
    }

    const result = await addCurrentSellerPurchaseRequestFavorite(item.id);

    if (!result.ok) {
      showError("No se pudo agregar a favoritos", result.error.message);
      return;
    }

    onFavoriteChange(item.id, true);
    showSuccess(result.data.alreadyExists ? "Ya estaba en favoritos" : "Favorito agregado");
  }, [isFavorite, item.id, onFavoriteChange]);

  const openCardOptions = useCallback(() => {
    didLongPressRef.current = true;
    openPopup({
      options: [
        {
          id: "favorite",
          label: isFavorite ? "Quitar de favoritos" : "Añadir como favorito",
          icon: isFavorite ? "star-off" : "star",
          textColorKey: "textDark",
          iconColorKey: "textDark",
          onPress: () => void toggleFavorite(),
        },
      ],
    });
    settleCard();
  }, [isFavorite, settleCard, toggleFavorite]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: liftTranslateY }, { scale: liftScale }],
      }}
    >
      <Pressable
        onPress={() => void openRequestConversation()}
        onPressIn={liftCard}
        onPressOut={handlePressOut}
        onLongPress={openCardOptions}
        accessibilityRole="button"
        style={s.pressable}
      >
        <GlassSurface
          variant="surface"
          highlight
          style={s.surface}
          contentStyle={s.card}
        >
          <View>
            <Text variant="subtitle" maxLines={1} style={s.title}>
              {item.title ?? "Solicitud"}
            </Text>
            {categoryName ? (
              <Text variant="body" maxLines={1} style={s.category}>
                {categoryName}
              </Text>
            ) : null}
          </View>

          <View style={s.summarySlot}>
            {summaryText ? (
              <Text variant="body" maxLines={1} style={s.summary}>
                {summaryText}
              </Text>
            ) : null}
          </View>

          {statusLabel ? (
            <View style={s.statusPill}>
              <View style={s.statusDot} />
              <Text variant="body" maxLines={1} style={s.statusText}>
                {statusLabel}
              </Text>
            </View>
          ) : null}

          <View style={s.metaRow}>
            <View style={s.metaLeftRow}>
              <View style={s.metaItemRow}>
                <Icon name="eye" size={18} color={t.colors.stateAnulated} />
                <Text variant="body" color="stateAnulated" maxLines={1}>
                  {item.views_count}
                </Text>
              </View>

              {isFavorite ? (
                <View style={s.metaItemRow}>
                  <Icon name="star" size={16} color={t.colors.accentYellow} />
                  <Text variant="body" color="stateAnulated" maxLines={1}>
                    Favorita
                  </Text>
                </View>
              ) : null}

              {offersCount != null ? (
                <View style={s.metaItemRow}>
                  <Icon name="message-circle" size={16} color={t.colors.stateAnulated} />
                  <Text variant="body" color="stateAnulated" maxLines={1}>
                    {offersCount}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text variant="body" color="stateAnulated" maxLines={1}>
              {publishedLabel}
            </Text>
          </View>
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

function formatPublishedLabel(rawDate: string | null): string {
  if (!rawDate) return "Ahora";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "Ahora";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin <= 1) return "Justo ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} d`;
  return date.toLocaleDateString("es-CR");
}

function createSellerHomeRequestCardStyles(t: Theme) {
  return {
    pressable: {
      width: 270,
      height: 176,
      borderRadius: 24,
    },
    surface: {
      height: 176,
      borderRadius: 24,
    },
    card: {
      height: 176,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 8,
      overflow: "hidden",
    },
    title: {
      color: t.colors.textDark,
    },
    category: {
      color: t.colors.textMedium,
    },
    summarySlot: {
      minHeight: t.typography.body.lineHeight,
    },
    summary: {
      color: t.colors.stateAnulated,
    },
    statusPill: {
      ...t.glass.chip,
      alignSelf: "flex-start",
      maxWidth: "100%",
      minHeight: 30,
      backgroundColor: t.colors.primaryLight,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: t.colors.primary,
      flexShrink: 0,
    },
    statusText: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 24,
      gap: t.spacing.sm,
    },
    metaLeftRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      flexShrink: 1,
    },
    metaItemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
      flexShrink: 1,
    },
  } as const;
}

function toPurchaseRequestParam(item: BuyerHomePurchaseRequestItem) {
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
