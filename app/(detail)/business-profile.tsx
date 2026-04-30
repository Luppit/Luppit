import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import {
  BusinessCategoryOption,
  SellerBusinessCategoryPreference,
  SellerProfileOverview,
  getCurrentBusinessCategoryOptions,
  getCurrentSellerProfileOverview,
  updateCurrentBusinessCategoryPreferences,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function BusinessProfileScreen() {
  const t = useTheme();
  const s = useMemo(() => createBusinessProfileStyles(t), [t]);
  const [overview, setOverview] = useState<SellerProfileOverview | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<BusinessCategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<SellerBusinessCategoryPreference[]>([]);
  const [initialCategoryIds, setInitialCategoryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    const [profileResult, categoryResult] = await Promise.all([
      getCurrentSellerProfileOverview(),
      getCurrentBusinessCategoryOptions(),
    ]);

    if (!profileResult.ok) {
      setOverview(null);
      setIsLoading(false);
      showError("No se pudo cargar el negocio", profileResult.error.message);
      return;
    }

    if (!categoryResult.ok) {
      setCategoryOptions([]);
      showError("No se pudieron cargar las categorías", categoryResult.error.message);
    } else {
      setCategoryOptions(categoryResult.data);
    }

    const nextSelectedCategories = profileResult.data.business?.categoryPreferences ?? [];
    setOverview(profileResult.data);
    setSelectedCategories(nextSelectedCategories);
    setInitialCategoryIds(nextSelectedCategories.map((preference) => preference.categoryId));
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  const business = overview?.business ?? null;
  const selectedCategoryIds = useMemo(
    () => new Set(selectedCategories.map((preference) => preference.categoryId)),
    [selectedCategories]
  );
  const availableCategories = useMemo(
    () => categoryOptions.filter((category) => !selectedCategoryIds.has(category.id)),
    [categoryOptions, selectedCategoryIds]
  );
  const categoryLabel = getCategoryLabel(selectedCategories);
  const locationLabel = getLocationLabel(business);
  const ratingLabel =
    typeof business?.rating === "number" && business.numRatings > 0
      ? `${business.rating.toFixed(1)} (${business.numRatings} calificaciones)`
      : "Sin calificaciones";
  const hasCategoryChanges = haveCategoryIdsChanged(
    initialCategoryIds,
    selectedCategories.map((preference) => preference.categoryId)
  );

  const addCategory = (category: BusinessCategoryOption) => {
    setSelectedCategories((current) => {
      if (current.some((preference) => preference.categoryId === category.id)) {
        return current;
      }

      return [
        ...current,
        {
          id: `local-${category.id}`,
          categoryId: category.id,
          categoryName: category.name,
          categoryPath: category.path,
        },
      ];
    });
  };

  const removeCategory = (categoryId: string) => {
    setSelectedCategories((current) =>
      current.filter((preference) => preference.categoryId !== categoryId)
    );
  };

  const saveCategoryPreferences = async () => {
    if (!hasCategoryChanges || isSaving) return;

    const nextCategoryIds = selectedCategories.map((preference) => preference.categoryId);
    setIsSaving(true);
    const result = await updateCurrentBusinessCategoryPreferences(nextCategoryIds);
    setIsSaving(false);

    if (!result.ok) {
      showError("No se pudieron actualizar las categorías", result.error.message);
      return;
    }

    setInitialCategoryIds(result.data.categoryIds);
    showSuccess("Categorías actualizadas");
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
            {categoryLabel}
          </Text>
        </View>
      </View>

      <BusinessSection title="Datos generales">
        <InfoRow label="Nombre comercial" value={business.name || "Sin nombre"} />
        <InfoRow
          label="Documento de identificación"
          value={business.idDocument || "Sin documento"}
        />
        <InfoRow label="Ubicación" value={locationLabel} />
        <InfoRow label="Fecha de creación" value={formatDate(business.createdAt)} />
      </BusinessSection>

      <BusinessSection title="Reputación">
        <InfoRow label="Rating del negocio" value={ratingLabel} />
      </BusinessSection>

      <BusinessSection title="Preferencias de oportunidades">
        <InfoRow label="Categorías activas" value={categoryLabel} />
        {selectedCategories.length === 0 ? (
          <View style={s.emptyCategoryRow}>
            <Text color="stateAnulated">Sin categorías configuradas.</Text>
          </View>
        ) : (
          selectedCategories.map((preference) => (
            <CategoryPreferenceRow
              key={preference.categoryId}
              preference={preference}
              onRemove={() => removeCategory(preference.categoryId)}
            />
          ))
        )}
      </BusinessSection>

      <BusinessSection title="Agregar categorías">
        {availableCategories.length === 0 ? (
          <View style={s.emptyCategoryRow}>
            <Text color="stateAnulated">No hay más categorías disponibles.</Text>
          </View>
        ) : (
          availableCategories.map((category) => (
            <CategoryOptionRow
              key={category.id}
              category={category}
              onAdd={() => addCategory(category)}
            />
          ))
        )}
      </BusinessSection>

      {hasCategoryChanges ? (
        <View style={s.footerAction}>
          <Button
            title="Guardar cambios"
            loading={isSaving}
            disabled={isSaving}
            onPress={() => void saveCategoryPreferences()}
          />
        </View>
      ) : null}
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
}: {
  label: string;
  value: string;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessProfileStyles(t), [t]);

  return (
    <View style={s.row}>
      <View style={s.rowText}>
        <Text>{label}</Text>
        <Text color="stateAnulated" maxLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function CategoryPreferenceRow({
  preference,
  onRemove,
}: {
  preference: SellerBusinessCategoryPreference;
  onRemove: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessProfileStyles(t), [t]);

  return (
    <View style={s.categoryRow}>
      <View style={s.categoryIcon}>
        <Icon name="tag" size={18} color={t.colors.secondary} />
      </View>
      <View style={s.rowText}>
        <Text maxLines={1}>{preference.categoryName}</Text>
        <Text variant="caption" color="stateAnulated" maxLines={2}>
          {preference.categoryPath || "Sin ruta configurada"}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        hitSlop={10}
        onPress={onRemove}
        style={s.categoryActionButton}
      >
        <Icon name="x" size={18} color={t.colors.error} />
      </Pressable>
    </View>
  );
}

function CategoryOptionRow({
  category,
  onAdd,
}: {
  category: BusinessCategoryOption;
  onAdd: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessProfileStyles(t), [t]);

  return (
    <Pressable accessibilityRole="button" onPress={onAdd} style={s.categoryRow}>
      <View style={s.categoryIcon}>
        <Icon name="tag" size={18} color={t.colors.secondary} />
      </View>
      <View style={s.rowText}>
        <Text maxLines={1}>{category.name}</Text>
        <Text variant="caption" color="stateAnulated" maxLines={2}>
          {category.path || "Sin ruta configurada"}
        </Text>
      </View>
      <View style={s.categoryActionButton}>
        <Icon name="plus" size={18} color={t.colors.primary} />
      </View>
    </Pressable>
  );
}

function getCategoryLabel(preferences: SellerBusinessCategoryPreference[]) {
  const names = preferences
    .map((preference) => preference.categoryName.trim())
    .filter(Boolean);

  return names.length > 0 ? names.join(", ") : "Sin categoría configurada";
}

function haveCategoryIdsChanged(initialIds: string[], currentIds: string[]) {
  if (initialIds.length !== currentIds.length) return true;

  const currentSet = new Set(currentIds);
  return initialIds.some((id) => !currentSet.has(id));
}

function getLocationLabel(business: SellerProfileOverview["business"]) {
  const locationParts = [
    business?.location?.district,
    business?.location?.canton,
    business?.location?.province,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  return locationParts.length > 0 ? locationParts.join(", ") : "Sin ubicación";
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

function createBusinessProfileStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.lg,
      paddingTop: t.spacing.sm,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.lg,
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
    categoryRow: {
      minHeight: 64,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    emptyCategoryRow: {
      minHeight: 56,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      justifyContent: "center",
    },
    categoryIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: "rgba(202,115,48,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    categoryActionButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    footerAction: {
      paddingTop: t.spacing.sm,
    },
  });
}
