import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { signOut } from "@/src/lib/supabase";
import { getCurrentProfileUnreadNotificationCount } from "@/src/services/notification.service";
import {
  BuyerProfileOverview,
  SellerProfileOverview,
  getCurrentBuyerProfileOverview,
  getCurrentSellerProfileOverview,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showInfo } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
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
  const [overview, setOverview] = useState<BuyerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    void refreshUnreadNotificationsCount(setUnreadNotificationsCount);
    const result = await getCurrentBuyerProfileOverview();
    if (!result.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar tu perfil", result.error.message);
      return;
    }

    setOverview(result.data);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  const phone = overview?.profile.phone?.trim() || "";
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
          <View style={s.phoneCard}>
            <View style={[s.iconBadge, s.phoneIconBadge]}>
              <Icon name="lock" size={20} color={t.colors.primary} />
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

          <View style={s.actionList}>
            <ActionRow
              icon="bell"
              label="Notificaciones"
              unreadCount={unreadNotificationsCount}
              accessibilityLabel={getNotificationRowAccessibilityLabel(unreadNotificationsCount)}
              onPress={() =>
                router.push({
                  pathname: "/(detail)/notifications",
                  params: { title: "Notificaciones", hideMenu: "true" },
                })
              }
            />
            <ActionRow
              icon="life-buoy"
              label="Contactar soporte"
              onPress={() => showInfo("Soporte", "Estamos preparando este canal de ayuda.")}
            />
            <ActionRow
              icon="help-circle"
              label="Ayuda"
              onPress={() => showInfo("Ayuda", "Pronto tendrás más información aquí.")}
            />
            <ActionRow
              icon="log-out"
              label="Cerrar sesión"
              destructive
              onPress={signOut}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function SellerProfileContent() {
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);
  const [overview, setOverview] = useState<SellerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    void refreshUnreadNotificationsCount(setUnreadNotificationsCount);
    const result = await getCurrentSellerProfileOverview();
    if (!result.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar tu perfil", result.error.message);
      return;
    }

    setOverview(result.data);
    setIsLoading(false);
  }, []);

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
            <View style={[s.iconBadge, s.phoneIconBadge]}>
              <Icon name="lock" size={20} color={t.colors.primary} />
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

          <View style={s.actionList}>
            <ActionRow
              icon="bell"
              label="Notificaciones"
              unreadCount={unreadNotificationsCount}
              accessibilityLabel={getNotificationRowAccessibilityLabel(unreadNotificationsCount)}
              onPress={() =>
                router.push({
                  pathname: "/(detail)/notifications",
                  params: { title: "Notificaciones", hideMenu: "true" },
                })
              }
            />
            <ActionRow
              icon="life-buoy"
              label="Contactar soporte"
              onPress={() => showInfo("Soporte", "Estamos preparando este canal de ayuda.")}
            />
            <ActionRow
              icon="help-circle"
              label="Ayuda"
              onPress={() => showInfo("Ayuda", "Pronto tendrás más información aquí.")}
            />
            <ActionRow
              icon="log-out"
              label="Cerrar sesión"
              destructive
              onPress={signOut}
            />
          </View>
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
      <View style={[s.iconBadge, { backgroundColor: toneStyle.backgroundColor }]}>
        <Icon name={icon} size={20} color={toneStyle.color} />
      </View>
      <View style={s.statBody}>
        <Text color="textMedium" maxLines={1}>
          {label}
        </Text>
        <View style={wide ? s.statWideValueRow : null}>
          <Text variant="subtitle" maxLines={1} style={s.statValue}>
            {value}
          </Text>
          <Text color="stateAnulated" maxLines={1} style={wide ? s.statWideDetail : null}>
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
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);

  if (!business) {
    return (
      <View style={s.businessCard}>
        <View style={[s.iconBadge, s.phoneIconBadge]}>
          <Icon name="house" size={20} color={t.colors.primary} />
        </View>
        <View style={s.businessText}>
          <Text variant="subtitle">Información del negocio</Text>
          <Text color="stateAnulated">
            No encontramos un negocio asociado a este perfil.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/(detail)/business-profile",
          params: { title: "Negocio", hideMenu: "true" },
        })
      }
      style={s.businessCard}
    >
      <View style={[s.iconBadge, s.phoneIconBadge]}>
        <Icon name="house" size={20} color={t.colors.primary} />
      </View>
      <View style={s.businessText}>
        <Text variant="subtitle" maxLines={1} style={s.flexText}>
          Información del negocio
        </Text>
        <Text color="stateAnulated" maxLines={2}>
          {business.name || "Negocio sin nombre"} · Ver información del negocio
        </Text>
      </View>
      <Icon name="arrow-right" size={18} color={t.colors.stateAnulated} />
    </Pressable>
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

async function refreshUnreadNotificationsCount(
  setUnreadNotificationsCount: (count: number) => void
) {
  try {
    const result = await getCurrentProfileUnreadNotificationCount();
    if (result.ok) {
      setUnreadNotificationsCount(result.data);
    }
  } catch {
    return;
  }
}

function ActionRow({
  icon,
  label,
  unreadCount,
  accessibilityLabel,
  destructive = false,
  onPress,
}: {
  icon: "bell" | "life-buoy" | "help-circle" | "log-out";
  label: string;
  unreadCount?: number;
  accessibilityLabel?: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);
  const color = destructive ? t.colors.error : t.colors.textDark;
  const displayCount = Math.max(0, unreadCount ?? 0);
  const displayCountLabel = displayCount > 99 ? "99+" : String(displayCount);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={s.actionRow}
    >
      <Icon name={icon} size={22} color={color} />
      <Text style={[s.actionLabel, { color }]}>{label}</Text>
      {displayCount > 0 ? (
        <View
          style={s.actionCountPill}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text variant="label" color="backgroudWhite" style={s.actionCountText}>
            {displayCountLabel}
          </Text>
        </View>
      ) : null}
      {!destructive ? (
        <Icon name="arrow-right" size={18} color={t.colors.stateAnulated} />
      ) : null}
    </Pressable>
  );
}

function createProfileStyles(t: Theme) {
  const cardSurface = {
    ...t.glass.surface,
  };

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
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      ...cardSurface,
    },
    loadingBox: {
      minHeight: 180,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    phoneCard: {
      minHeight: 76,
      borderRadius: t.borders.md,
      ...cardSurface,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm + t.spacing.xs,
    },
    phoneText: {
      flex: 1,
      gap: 2,
    },
    businessCard: {
      minHeight: 84,
      borderRadius: t.borders.md,
      ...cardSurface,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm + t.spacing.xs,
    },
    businessText: {
      flex: 1,
      gap: t.spacing.xs,
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
      width: "47.6%",
      borderRadius: t.borders.md,
      ...cardSurface,
      padding: t.spacing.md,
      justifyContent: "space-between",
      gap: t.spacing.lg,
    },
    statCardWide: {
      width: "100%",
      minHeight: 112,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: t.spacing.md,
    },
    iconBadge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    phoneIconBadge: {
      backgroundColor: "rgba(131,163,30,0.14)",
    },
    statBody: {
      gap: t.spacing.xs,
      flex: 1,
    },
    statValue: {
      color: t.colors.textDark,
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
    actionList: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    actionRow: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    actionLabel: {
      flex: 1,
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
