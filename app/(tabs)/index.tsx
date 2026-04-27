import { Icon } from "@/src/components/Icon";
import Button from "@/src/components/button/Button";
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
import { getOrCreateCurrentSellerConversationByPurchaseRequestId } from "@/src/services/conversation.service";
import { getPurchaseOffersCountByPurchaseRequestIds } from "@/src/services/purchase.offer.service";
import {
  BuyerHomePurchaseRequestGroup,
  BuyerHomePurchaseRequestItem,
  getCurrentBuyerHomePurchaseRequestGroups,
  getCurrentSellerHomePurchaseRequestGroups,
  SellerHomePurchaseRequestGroup,
  SellerHomePurchaseRequestItem,
} from "@/src/services/purchase.request.service";
import { registerPurchaseRequestVisualization } from "@/src/services/purchase.request.visualization.service";
import { useTheme } from "@/src/themes";
import { showError, showInfo } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { Asset } from "expo-asset";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";

export default function HomeScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, padding: t.spacing.xs }}>
      <RoleGate
        loading={<Text>Cargando contenido...</Text>}
        buyer={<BuyerHomeContent />}
        seller={<SellerHomeContent />}
      />
    </View>
  );
}

function BuyerHomeContent() {
  const t = useTheme();
  const emptyBoxAsset = Asset.fromModule(require("../../assets/images/empty_box.svg"));
  const [isLoading, setIsLoading] = useState(true);
  const [emailSetupStatus, setEmailSetupStatus] = useState<ProfileEmailSetupStatus | null>(null);
  const [groups, setGroups] = useState<BuyerHomePurchaseRequestGroup[]>([]);
  const [offerCountsByRequestId, setOfferCountsByRequestId] = useState<Record<string, number>>({});
  const [filters, setFilters] = useState<BuyerHomeFilters>(getBuyerHomeFilters());
  const fullBleedOffset = t.spacing.md + t.spacing.xs;

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    const emailSetupResult = await getCurrentProfileEmailSetupStatus();
    if (!emailSetupResult.ok) {
      setEmailSetupStatus(null);
      setGroups([]);
      setOfferCountsByRequestId({});
      setIsLoading(false);
      return;
    }

    setEmailSetupStatus(emailSetupResult.data);
    if (!emailSetupResult.data.isComplete) {
      setGroups([]);
      setOfferCountsByRequestId({});
      setIsLoading(false);
      return;
    }

    const result = await getCurrentBuyerHomePurchaseRequestGroups(filters);
    const nextGroups = result.ok ? result.data : [];
    setGroups(nextGroups);

    const requestIds = nextGroups.flatMap((group) => group.items.map((item) => item.id));
    const countsResult = await getPurchaseOffersCountByPurchaseRequestIds(requestIds);
    setOfferCountsByRequestId(countsResult.ok ? countsResult.data : {});
    setIsLoading(false);
  }, [filters]);

  useEffect(() => {
    return subscribeBuyerHomeFilters(setFilters);
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
  const hasActiveFilters = useMemo(() => hasBuyerHomeFilters(filters), [filters]);

  if (isLoading) {
    return <Text>Cargando solicitudes...</Text>;
  }

  if (emailSetupStatus && !emailSetupStatus.isComplete) {
    return <AccountSetupRequiredState />;
  }

  if (!hasAnyItems) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: t.spacing.md,
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
              },
            })
          }
          renderItem={(item) => (
            <BuyerHomeRequestCard
              key={item.id}
              item={item}
              offersCount={offerCountsByRequestId[item.id] ?? 0}
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
  const [filters, setFilters] = useState<SellerHomeFilters>(getSellerHomeFilters());
  const fullBleedOffset = t.spacing.md + t.spacing.xs;

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    const emailSetupResult = await getCurrentProfileEmailSetupStatus();
    if (!emailSetupResult.ok) {
      setEmailSetupStatus(null);
      setGroups([]);
      setIsLoading(false);
      return;
    }

    setEmailSetupStatus(emailSetupResult.data);
    if (!emailSetupResult.data.isComplete) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    const result = await getCurrentSellerHomePurchaseRequestGroups(filters);
    setGroups(result.ok ? result.data : []);
    setIsLoading(false);
  }, [filters]);

  useEffect(() => {
    return subscribeSellerHomeFilters(setFilters);
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
  const hasActiveFilters = useMemo(() => hasSellerHomeFilters(filters), [filters]);

  if (isLoading) {
    return <Text>Cargando solicitudes...</Text>;
  }

  if (emailSetupStatus && !emailSetupStatus.isComplete) {
    return <AccountSetupRequiredState />;
  }

  if (!hasAnyItems) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: t.spacing.md,
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
              },
            })
          }
          renderItem={(item) => <SellerHomeRequestCard key={item.id} item={item} />}
        />
      ))}
    </ScrollView>
  );
}

function AccountSetupRequiredState() {
  const t = useTheme();
  const emptyBoxAsset = Asset.fromModule(require("../../assets/images/empty_box.svg"));

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: t.spacing.md,
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
            paddingVertical: t.spacing.xs,
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
}: {
  item: BuyerHomePurchaseRequestItem;
  offersCount: number;
}) {
  return (
    <View style={{ width: 270 }}>
      <ProductCard
        title={item.title ?? "Solicitud"}
        subtitle={item.category_name ?? "-"}
        views={item.views_count}
        statusLabel={item.status_label ?? item.status}
        offersLabel={`${offersCount} ofertas`}
        onPress={() =>
          router.push({
            pathname: "/(detail)/purchase-request",
            params: {
              title: item.title ?? "Detalle de solicitud",
              purchaseRequest: JSON.stringify(toPurchaseRequestParam(item)),
            },
          })
        }
      />
    </View>
  );
}

function SellerHomeRequestCard({ item }: { item: SellerHomePurchaseRequestItem }) {
  const t = useTheme();
  const publishedLabel = formatPublishedLabel(item.published_at ?? item.created_at);
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

  return (
    <Pressable
      onPress={() => void openRequestConversation()}
      accessibilityRole="button"
      style={{
        width: 270,
        borderRadius: 22,
        backgroundColor: t.colors.primaryLight,
        padding: 8,
        gap: t.spacing.xs,
      }}
    >
      <View
        style={{
          backgroundColor: t.colors.backgroudWhite,
          borderRadius: 18,
          paddingHorizontal: t.spacing.md,
          paddingTop: t.spacing.sm + t.spacing.xs,
          paddingBottom: t.spacing.xs + t.spacing.xs,
          gap: t.spacing.md,
          shadowColor: t.colors.shadow,
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        <View>
          <Text variant="subtitle" maxLines={1}>
            {item.title ?? "Solicitud"}
          </Text>
          <Text variant="body" maxLines={1} color="stateAnulated">
            {item.category_name ?? "-"}
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.xs }}>
            <Icon name="eye" size={18} color={t.colors.stateAnulated} />
            <Text variant="body" color="stateAnulated">
              {item.views_count}
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.xs }}>
            <Icon name="star" size={18} color={t.colors.accentYellow} />
            <Text variant="body" color="stateAnulated">
              {item.views_count}
            </Text>
          </View>
        </View>
      </View>

      <Text variant="body" align="center">
        {publishedLabel}
      </Text>
    </Pressable>
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
