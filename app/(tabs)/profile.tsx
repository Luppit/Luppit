import { Icon } from "@/src/components/Icon";
import Button from "@/src/components/button/Button";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { signOut } from "@/src/lib/supabase";
import {
  BuyerProfileOverview,
  getCurrentBuyerProfileOverview,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showInfo } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function ProfileScreen() {
  return (
    <RoleGate
      loading={<Text>Cargando contenido...</Text>}
      buyer={<BuyerProfileContent />}
      seller={<SellerProfileFallback />}
    />
  );
}

function BuyerProfileContent() {
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);
  const [overview, setOverview] = useState<BuyerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
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
        <View style={s.loadingBox}>
          <ActivityIndicator color={t.colors.primary} />
          <Text color="stateAnulated">Cargando perfil...</Text>
        </View>
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
              onPress={() => showInfo("Notificaciones", "Esta opción estará disponible pronto.")}
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

function SellerProfileFallback() {
  const t = useTheme();

  return (
    <View style={{ flex: 1, padding: t.spacing.md, gap: t.spacing.md }}>
      <Text variant="title">Profile Seller</Text>
      <Button variant="dark" title="Sign Out" onPress={signOut} />
    </View>
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
  icon: "file-text" | "star" | "tag";
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

function ActionRow({
  icon,
  label,
  destructive = false,
  onPress,
}: {
  icon: "bell" | "life-buoy" | "help-circle" | "log-out";
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createProfileStyles(t), [t]);
  const color = destructive ? t.colors.error : t.colors.textDark;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={s.actionRow}>
      <Icon name={icon} size={22} color={color} />
      <Text style={[s.actionLabel, { color }]}>{label}</Text>
      {!destructive ? (
        <Icon name="arrow-right" size={18} color={t.colors.stateAnulated} />
      ) : null}
    </Pressable>
  );
}

function createProfileStyles(t: Theme) {
  const cardSurface = {
    backgroundColor: t.colors.backgroudWhite,
    shadowColor: t.colors.shadow,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
      default: {
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
      },
    }),
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
  });
}
