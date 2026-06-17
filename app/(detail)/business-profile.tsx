import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import { formatLocationLabel } from "@/src/services/location.service";
import {
  SellerBusinessCategoryPreference,
  SellerProfileOverview,
  getCurrentSellerProfileOverview,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

export default function BusinessProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createBusinessProfileStyles(t, topContentInset),
    [t, topContentInset]
  );
  const [overview, setOverview] = useState<SellerProfileOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    const profileResult = await getCurrentSellerProfileOverview();

    if (!profileResult.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar el negocio", profileResult.error.message);
      return;
    }

    setOverview(profileResult.data);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  const business = overview?.business ?? null;
  const selectedCategories = business?.categoryPreferences ?? [];
  const categoryLabel = getCategoryCountLabel(selectedCategories.length);
  const categoryPreview = getCategoryPreviewLabel(
    selectedCategories.map((preference) => preference.categoryName)
  );
  const locationLabel = formatLocationLabel(business?.location);
  const ratingLabel =
    typeof business?.rating === "number" && business.numRatings > 0
      ? `${business.rating.toFixed(1)} (${business.numRatings} calificaciones)`
      : "Sin calificaciones";

  const openCategoryEditor = () => {
    router.push({
      pathname: "/(detail)/business-categories",
      params: {
        title: "Categorías de venta",
        hideMenu: "true",
      },
    });
  };

  if (isLoading) {
    return <LoadingState label="Cargando negocio..." style={s.loadingBox} />;
  }

  if (!business) {
    return (
      <View style={s.emptyState}>
        <View style={s.emptyIcon}>
          <Icon name="house" size={24} color={t.colors.primary} />
        </View>
        <Text variant="subtitle" align="center">
          No encontramos un negocio asociado
        </Text>
        <Text color="stateAnulated" align="center">
          Cuando el perfil tenga un negocio vinculado, la información aparecerá aquí.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Icon name="house" size={24} color={t.colors.primary} />
        </View>
        <View style={s.heroText}>
          <Text variant="title" maxLines={2}>
            {business.name || "Negocio sin nombre"}
          </Text>
          <Text color="stateAnulated" maxLines={2}>
            {categoryPreview || categoryLabel}
          </Text>
        </View>
      </View>

      <BusinessSection title="Datos generales">
        <InfoRow label="Nombre comercial" value={business.name || "Sin nombre"} />
        <InfoRow
          label="Documento de identificación"
          value={business.idDocument || "Sin documento"}
        />
        <InfoRow
          label="Ubicación"
          value={locationLabel}
          onPress={() =>
            router.push({
              pathname: "/(modal)/business-location-edit",
              params: {
                title: "Editar ubicación",
                locationId: business.location?.id ?? "",
                locationLabel,
              },
            })
          }
        />
        <InfoRow label="Fecha de creación" value={formatDate(business.createdAt)} />
      </BusinessSection>

      <BusinessSection title="Reputación">
        <InfoRow label="Rating del negocio" value={ratingLabel} />
      </BusinessSection>

      <BusinessSection title="Preferencias de oportunidades">
        <InfoRow
          label="Categorías de venta"
          value={categoryLabel}
          onPress={openCategoryEditor}
        />
        {selectedCategories.length === 0 ? (
          <View style={s.emptyCategoryRow}>
            <Text color="stateAnulated">Sin categorías configuradas.</Text>
            <Text variant="caption" color="stateAnulated">
              Toca la fila para elegir dónde quieres recibir oportunidades.
            </Text>
          </View>
        ) : (
          <CategoryPreview preferences={selectedCategories} />
        )}
      </BusinessSection>
    </ScrollView>
  );
}

function BusinessSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessProfileStyles(t), [t]);

  return (
    <View style={s.section}>
      <Text variant="subtitle">{title}</Text>
      <View style={s.rowGroup}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessProfileStyles(t), [t]);
  const content = (
    <>
      <View style={s.rowText}>
        <Text>{label}</Text>
        <Text color="stateAnulated" maxLines={2}>
          {value}
        </Text>
      </View>
      {onPress ? <Icon name="arrow-right" size={18} color={t.colors.stateAnulated} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={s.row}>
      {content}
    </View>
  );
}

function CategoryPreview({
  preferences,
}: {
  preferences: SellerBusinessCategoryPreference[];
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessProfileStyles(t), [t]);
  const visiblePreferences = preferences.slice(0, 3);
  const hiddenCount = preferences.length - visiblePreferences.length;

  return (
    <View style={s.previewRow}>
      <View style={s.previewChips}>
        {visiblePreferences.map((preference) => (
          <View key={preference.categoryId} style={s.previewChip}>
            <Icon name="tag" size={14} color={t.colors.secondary} />
            <Text variant="caption" maxLines={1} style={s.previewChipLabel}>
              {preference.categoryName}
            </Text>
          </View>
        ))}
        {hiddenCount > 0 ? (
          <View style={s.previewChip}>
            <Text variant="caption" style={s.previewChipLabel}>
              +{hiddenCount}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function getCategoryCountLabel(count: number) {
  if (count === 0) return "Sin categorías configuradas";
  if (count === 1) return "1 categoría seleccionada";
  return `${count} categorías seleccionadas`;
}

function getCategoryPreviewLabel(names: string[]) {
  if (names.length === 0) return "";

  const previewNames = names.slice(0, 3);
  const remainingCount = names.length - previewNames.length;
  return `${previewNames.join(", ")}${remainingCount > 0 ? `, +${remainingCount}` : ""}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function createBusinessProfileStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.lg,
      paddingTop: topContentInset + t.spacing.sm,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.lg,
      paddingTop: topContentInset,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: "rgba(131,163,30,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    hero: {
      minHeight: 104,
      borderRadius: t.borders.md,
      backgroundColor: t.colors.backgroudWhite,
      padding: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 5,
      elevation: 2,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: "rgba(131,163,30,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroText: {
      flex: 1,
      gap: t.spacing.xs,
    },
    section: {
      gap: t.spacing.sm,
    },
    rowGroup: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    row: {
      minHeight: 64,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    emptyCategoryRow: {
      minHeight: 64,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      justifyContent: "center",
      gap: 2,
    },
    previewRow: {
      minHeight: 56,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      justifyContent: "center",
    },
    previewChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    previewChip: {
      maxWidth: "100%",
      minHeight: 32,
      borderRadius: 999,
      ...t.glass.chip,
      paddingHorizontal: t.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    previewChipLabel: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
  });
}
