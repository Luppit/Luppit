import { Icon } from "@/src/components/Icon";
import {
  GroupedList,
  GroupedListRow,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import ProfilePicture, {
  getProfilePictureSource,
} from "@/src/components/profile/ProfilePicture";
import RoleGate from "@/src/components/role/RoleGate";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  BuyerProfileOverview,
  SellerProfileOverview,
  getCurrentBuyerProfileOverview,
  getCurrentSellerProfileOverview,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { openSignOutConfirmation } from "@/src/utils/openSignOutConfirmation";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function ProfileScreen() {
  return (
    <RoleGate
      loading={<LoadingState label="Cargando contenido..." />}
      buyer={<BuyerProfileContent />}
      seller={<SellerProfileContent />}
    />
  );
}

function BuyerProfileContent() {
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);
  const { unreadNotificationCount, refreshUnreadNotificationCount } =
    useActiveProfile();
  const [overview, setOverview] = useState<BuyerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    void refreshUnreadNotificationCount();
    const result = await getCurrentBuyerProfileOverview();
    if (!result.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar tu perfil", result.error.message);
      return;
    }

    setOverview(result.data);
    setIsLoading(false);
  }, [refreshUnreadNotificationCount]);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  const phone = overview?.profile.phone?.trim() || "";
  const buyerPicture = getProfilePictureSource(overview);
  const rating = overview?.stats.rating;
  const ratingLabel =
    typeof rating === "number" && overview?.stats.numRatings
      ? rating.toFixed(1)
      : "Sin rating";
  const ratingDetail = overview?.stats.numRatings
    ? `${overview.stats.numRatings} calificaciones`
    : "Sin calificaciones";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <View style={s.header}>
        <Text variant="title">Mi cuenta</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() =>
            router.push({
              pathname: "/(detail)/account-settings",
              params: { title: "Configuración", hideMenu: "true" },
            })
          }
          style={s.iconButton}
        >
          <Icon name="settings" size={22} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState label="Cargando perfil..." variant="inline" style={s.loadingBox} />
      ) : (
        <>
          <View style={s.buyerIdentityCard}>
            <ProfilePicture
              kind="buyer"
              name={overview?.profile.name}
              imagePath={buyerPicture.imagePath}
              imageUrl={buyerPicture.imageUrl}
              size={72}
            />
            <View style={s.buyerIdentityText}>
              <Text variant="subtitle" maxLines={2} style={s.flexText}>
                {overview?.profile.name?.trim() || "Perfil de comprador"}
              </Text>
              <View style={s.buyerPhoneText}>
                <Text variant="small" color="stateAnulated">
                  Número telefónico
                </Text>
                <Text maxLines={1} style={s.flexText}>
                  {phone || "Sin número registrado"}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.statsGrid}>
            <StatCard
              label="Solicitudes"
              value={String(overview?.stats.purchaseRequestsCount ?? 0)}
              detail="creadas"
              icon="file-text"
              tone="primary"
            />
            <StatCard
              label="Rating promedio"
              value={ratingLabel}
              detail={ratingDetail}
              icon="star"
              tone="warning"
            />
            <StatCard
              label="Ofertas"
              value={String(overview?.stats.offersReceivedCount ?? 0)}
              detail="recibidas"
              icon="tag"
              tone="secondary"
              wide
            />
          </View>

          <GroupedList>
            <GroupedListRow
              icon="check"
              label="Solicitudes finalizadas"
              onPress={() =>
                router.push({
                  pathname: "/(detail)/completed-requests",
                  params: { title: "Solicitudes finalizadas", hideMenu: "true" },
                })
              }
            />
            <GroupedListRow
              icon="bell"
              label="Notificaciones"
              accessibilityLabel={getNotificationRowAccessibilityLabel(unreadNotificationCount)}
              rightAccessory={<NotificationCountPill count={unreadNotificationCount} />}
              onPress={() =>
                router.push({
                  pathname: "/(detail)/notifications",
                  params: { title: "Notificaciones", hideMenu: "true" },
                })
              }
            />
            <GroupedListRow
              icon="help-circle"
              label="Ayuda"
              onPress={() =>
                router.push({
                  pathname: "/(detail)/faq",
                  params: { title: "Ayuda", hideMenu: "true" },
                })
              }
            />
            <GroupedListRow
              icon="log-out"
              label="Cerrar sesión"
              destructive
              showChevron={false}
              showSeparator={false}
              onPress={openSignOutConfirmation}
            />
          </GroupedList>
        </>
      )}
    </ScrollView>
  );
}

function SellerProfileContent() {
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);
  const { unreadNotificationCount, refreshUnreadNotificationCount } =
    useActiveProfile();
  const [overview, setOverview] = useState<SellerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    void refreshUnreadNotificationCount();
    const result = await getCurrentSellerProfileOverview();
    if (!result.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar tu perfil", result.error.message);
      return;
    }

    setOverview(result.data);
    setIsLoading(false);
  }, [refreshUnreadNotificationCount]);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  const phone = overview?.profile.phone?.trim() || "";
  const business = overview?.business ?? null;
  const rating = business?.rating;
  const ratingLabel =
    typeof rating === "number" && business?.numRatings
      ? rating.toFixed(1)
      : "Sin rating";
  const ratingDetail = business?.numRatings
    ? `${business.numRatings} calificaciones`
    : "Sin calificaciones";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <View style={s.header}>
        <Text variant="title">Mi cuenta</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() =>
            router.push({
              pathname: "/(detail)/account-settings",
              params: { title: "Configuración", hideMenu: "true" },
            })
          }
          style={s.iconButton}
        >
          <Icon name="settings" size={22} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState label="Cargando perfil..." variant="inline" style={s.loadingBox} />
      ) : (
        <>
          <View style={s.phoneCard}>
            <View style={s.iconBadge}>
              <Icon name="lock" size={21} color={t.colors.textDark} />
            </View>
            <View style={s.phoneText}>
              <Text color="stateAnulated">Número telefónico</Text>
              <Text variant="subtitle" maxLines={1} style={s.flexText}>
                {phone || "Sin número registrado"}
              </Text>
            </View>
          </View>

          <View style={s.statsGrid}>
            <StatCard
              label="Negocio"
              value={business?.name || "Sin negocio"}
              detail={business ? "asignado" : "pendiente"}
              icon="house"
              tone="primary"
            />
            <StatCard
              label="Rating promedio"
              value={ratingLabel}
              detail={ratingDetail}
              icon="star"
              tone="warning"
            />
          </View>

          <BusinessSummaryCard business={business} />

          <GroupedList>
            <GroupedListRow
              icon="check"
              label="Solicitudes finalizadas"
              onPress={() =>
                router.push({
                  pathname: "/(detail)/completed-requests",
                  params: { title: "Solicitudes finalizadas", hideMenu: "true" },
                })
              }
            />
            <GroupedListRow
              icon="bell"
              label="Notificaciones"
              accessibilityLabel={getNotificationRowAccessibilityLabel(unreadNotificationCount)}
              rightAccessory={<NotificationCountPill count={unreadNotificationCount} />}
              onPress={() =>
                router.push({
                  pathname: "/(detail)/notifications",
                  params: { title: "Notificaciones", hideMenu: "true" },
                })
              }
            />
            <GroupedListRow
              icon="help-circle"
              label="Ayuda"
              onPress={() =>
                router.push({
                  pathname: "/(detail)/faq",
                  params: { title: "Ayuda", hideMenu: "true" },
                })
              }
            />
            <GroupedListRow
              icon="log-out"
              label="Cerrar sesión"
              destructive
              showChevron={false}
              showSeparator={false}
              onPress={openSignOutConfirmation}
            />
          </GroupedList>
        </>
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
  wide = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: "file-text" | "star" | "tag" | "house";
  tone: "primary" | "secondary" | "warning";
  wide?: boolean;
}) {
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);
  const toneStyle = getMetricTone(t, tone);

  return (
    <View style={[s.statCard, wide ? s.statCardWide : null]}>
      <View style={s.iconBadge}>
        <Icon name={icon} size={20} color={toneStyle.color} />
      </View>
      <View style={s.statBody}>
        <Text color="textMedium" maxLines={1} style={s.flexText}>
          {label}
        </Text>
        <View style={wide ? s.statWideValueRow : null}>
          <Text variant="subtitle" maxLines={1} style={s.statValue}>
            {value}
          </Text>
          <Text
            color="stateAnulated"
            maxLines={1}
            style={[s.flexText, wide ? s.statWideDetail : null]}
          >
            {detail}
          </Text>
        </View>
      </View>
    </View>
  );
}

function BusinessSummaryCard({
  business,
}: {
  business: SellerProfileOverview["business"];
}) {
  if (!business) {
    return (
      <GroupedList>
        <GroupedListRow
          icon="house"
          label="Información del negocio"
          description="No encontramos un negocio asociado a este perfil."
          showChevron={false}
          showSeparator={false}
        />
      </GroupedList>
    );
  }

  return (
    <GroupedList>
      <GroupedListRow
        icon="house"
        label="Información del negocio"
        description={`${business.name || "Negocio sin nombre"} · Ver información del negocio`}
        showSeparator={false}
        onPress={() =>
          router.push({
            pathname: "/(detail)/business-profile",
            params: { title: "Negocio", hideMenu: "true" },
          })
        }
      />
    </GroupedList>
  );
}

function getMetricTone(t: Theme, tone: "primary" | "secondary" | "warning") {
  if (tone === "secondary") {
    return {
      color: t.colors.secondary,
      backgroundColor: "rgba(202,115,48,0.14)",
    };
  }

  if (tone === "warning") {
    return {
      color: t.colors.accentYellow,
      backgroundColor: "rgba(216,166,0,0.14)",
    };
  }

  return {
    color: t.colors.primary,
    backgroundColor: "rgba(131,163,30,0.14)",
  };
}

function getNotificationRowAccessibilityLabel(unreadCount: number) {
  if (unreadCount <= 0) return "Notificaciones";
  return `Notificaciones, ${unreadCount > 99 ? "99 o más" : unreadCount} sin leer`;
}

function NotificationCountPill({ count }: { count: number }) {
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);
  const displayCount = Math.max(0, count);
  const displayCountLabel = displayCount > 99 ? "99+" : String(displayCount);

  if (displayCount <= 0) return null;

  return (
    <View
      style={s.actionCountPill}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text variant="small" color="backgroudWhite" style={s.actionCountText}>
        {displayCountLabel}
      </Text>
    </View>
  );
}

function createProfileStyles(t: Theme) {
  const cardSurface = createRoundedSurfaceStyle(t);

  return StyleSheet.create({
    content: {
      gap: t.spacing.lg,
      paddingHorizontal: t.spacing.xs,
      paddingTop: t.spacing.sm,
      paddingBottom: 112,
    },
    header: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    iconButton: {
      width: 44,
      height: 44,
      ...cardSurface,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingBox: {
      minHeight: 180,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    phoneCard: {
      minHeight: 76,
      ...cardSurface,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm + t.spacing.xs,
    },
    buyerIdentityCard: {
      minHeight: 104,
      ...cardSurface,
      padding: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    buyerIdentityText: {
      flex: 1,
      minWidth: 0,
      gap: t.spacing.xs,
    },
    buyerPhoneText: {
      gap: 2,
    },
    phoneText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    flexText: {
      flexShrink: 1,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.md,
    },
    statCard: {
      minHeight: 136,
      flex: 1,
      minWidth: 0,
      ...cardSurface,
      padding: t.spacing.md,
      justifyContent: Platform.OS === "android" ? "flex-start" : "space-between",
      gap: Platform.OS === "android" ? t.spacing.md : t.spacing.lg,
    },
    statCardWide: {
      flexBasis: "100%",
      width: "100%",
      minHeight: 112,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: t.spacing.md,
    },
    iconBadge: {
      width: 32,
      minHeight: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    statBody: {
      gap: t.spacing.xs,
      flex: 1,
      minWidth: 0,
    },
    statValue: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    statWideValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: t.spacing.xs,
      flexWrap: "wrap",
    },
    statWideDetail: {
      flexShrink: 1,
    },
    actionCountPill: {
      minWidth: 28,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: t.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primary,
    },
    actionCountText: {
      textAlign: "center",
    },
  });
}
