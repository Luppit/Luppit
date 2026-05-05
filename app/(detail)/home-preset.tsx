import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import {
  HomePresetOption,
  HomePresetPreviewGroup,
  HomePresetSurface,
  getCurrentBuyerHomePresetOptions,
  getCurrentSellerHomePresetOptions,
  updateCurrentBuyerHomePreset,
  updateCurrentSellerHomePreset,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomePresetScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createHomePresetStyles(t, insets.bottom), [t, insets.bottom]);
  const params = useLocalSearchParams<{ surface?: string | string[] }>();
  const surfaceParam = Array.isArray(params.surface) ? params.surface[0] : params.surface;
  const surface: HomePresetSurface = isHomePresetSurface(surfaceParam)
    ? surfaceParam
    : "buyer_home";
  const [options, setOptions] = useState<HomePresetOption[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadOptions = useCallback(async () => {
    setIsLoading(true);
    const result =
      surface === "seller_home"
        ? await getCurrentSellerHomePresetOptions()
        : await getCurrentBuyerHomePresetOptions();

    if (!result.ok) {
      setOptions([]);
      setSelectedPresetId(null);
      setCurrentPresetId(null);
      setIsLoading(false);
      showError("No se pudo cargar la vista de inicio", result.error.message);
      return;
    }

    const current = result.data.find((option) => option.isCurrent) ?? result.data[0] ?? null;
    setOptions(result.data);
    setCurrentPresetId(current?.id ?? null);
    setSelectedPresetId(current?.id ?? null);
    setIsLoading(false);
  }, [surface]);

  useFocusEffect(
    useCallback(() => {
      void loadOptions();
      return () => {};
    }, [loadOptions])
  );

  const canSave =
    Boolean(selectedPresetId) && selectedPresetId !== currentPresetId && !isSaving && !isLoading;

  const savePreset = async () => {
    if (!selectedPresetId || !canSave) return;

    setIsSaving(true);
    const result =
      surface === "seller_home"
        ? await updateCurrentSellerHomePreset(selectedPresetId)
        : await updateCurrentBuyerHomePreset(selectedPresetId);
    setIsSaving(false);

    if (!result.ok) {
      showError("No se pudo actualizar", result.error.message);
      return;
    }

    showSuccess("Vista de inicio actualizada");
    router.back();
  };

  if (isLoading) {
    return <LoadingState label="Cargando vistas..." style={s.loadingBox} />;
  }

  return (
    <View style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {options.length === 0 ? (
          <View style={s.emptyState}>
            <Icon name="folder-closed" size={28} color={t.colors.stateAnulated} />
            <Text align="center" color="stateAnulated">
              No hay vistas disponibles por ahora.
            </Text>
          </View>
        ) : (
          options.map((option) => (
            <PresetOptionCard
              key={option.id}
              option={option}
              selected={option.id === selectedPresetId}
              onPress={() => setSelectedPresetId(option.id)}
            />
          ))
        )}
      </ScrollView>

      <View style={s.footer}>
        <Button
          title="Guardar cambios"
          loading={isSaving}
          disabled={!canSave}
          onPress={() => void savePreset()}
        />
      </View>
    </View>
  );
}

function isHomePresetSurface(value: unknown): value is HomePresetSurface {
  return value === "buyer_home" || value === "seller_home";
}

function PresetOptionCard({
  option,
  selected,
  onPress,
}: {
  option: HomePresetOption;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createHomePresetStyles(t, insets.bottom), [t, insets.bottom]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[s.optionCard, selected ? s.optionCardSelected : null]}
    >
      <View style={s.optionHeader}>
        <View style={s.optionTitleBlock}>
          <Text variant="subtitle">{option.name}</Text>
          {option.description ? (
            <Text color="stateAnulated">
              {option.description}
            </Text>
          ) : null}
        </View>
        <View style={[s.checkCircle, selected ? s.checkCircleSelected : null]}>
          {selected ? <Icon name="check" size={16} color={t.colors.backgroudWhite} /> : null}
        </View>
      </View>

      <PresetBlueprint groups={option.groups} />
    </Pressable>
  );
}

function PresetBlueprint({ groups }: { groups: HomePresetPreviewGroup[] }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createHomePresetStyles(t, insets.bottom), [t, insets.bottom]);

  if (groups.length === 0) {
    return (
      <View style={s.previewEmpty}>
        <Text color="stateAnulated">Esta vista no tiene secciones configuradas.</Text>
      </View>
    );
  }

  return (
    <View style={s.previewSurface}>
      {groups.map((group) => (
        <PresetBlueprintGroup key={group.code} group={group} />
      ))}
    </View>
  );
}

function PresetBlueprintGroup({ group }: { group: HomePresetPreviewGroup }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createHomePresetStyles(t, insets.bottom), [t, insets.bottom]);
  const visibleItemCount = Math.min(group.maxItems, 4);

  return (
    <View style={s.previewGroup}>
      <View style={s.previewGroupHeader}>
        <Text variant="label" maxLines={1} style={s.previewGroupName}>
          {group.name}
        </Text>
        <Text variant="caption" color="stateAnulated">
          Máx. {group.maxItems}
        </Text>
      </View>
      <View style={s.previewItemsRow}>
        {Array.from({ length: visibleItemCount }).map((_, index) => (
          <View key={`${group.code}-${index}`} style={s.previewItem}>
            <View style={s.previewItemLineStrong} />
            <View style={s.previewItemLine} />
            <View style={s.previewItemBottomRow}>
              <View style={s.previewItemDot} />
              <View style={s.previewItemPill} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function createHomePresetStyles(t: Theme, bottomInset = 0) {
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
    container: {
      flex: 1,
    },
    content: {
      gap: t.spacing.md,
      paddingTop: t.spacing.sm,
      paddingBottom: 120 + bottomInset,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    emptyState: {
      minHeight: 220,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    optionCard: {
      borderRadius: t.borders.sm,
      ...cardSurface,
      borderWidth: 1,
      borderColor: "transparent",
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    optionCardSelected: {
      borderColor: t.colors.primary,
    },
    optionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.md,
    },
    optionTitleBlock: {
      flex: 1,
      gap: 2,
    },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleSelected: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    previewSurface: {
      backgroundColor: t.colors.background,
      borderRadius: t.borders.sm,
      padding: t.spacing.sm,
      gap: t.spacing.md,
    },
    previewEmpty: {
      backgroundColor: t.colors.background,
      borderRadius: t.borders.sm,
      minHeight: 72,
      alignItems: "center",
      justifyContent: "center",
      padding: t.spacing.md,
    },
    previewGroup: {
      gap: t.spacing.sm,
    },
    previewGroupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    previewGroupName: {
      flex: 1,
    },
    previewItemsRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
      flexWrap: "wrap",
    },
    previewItem: {
      width: 72,
      height: 54,
      borderRadius: 8,
      backgroundColor: t.colors.backgroudWhite,
      padding: t.spacing.xs,
      justifyContent: "space-between",
    },
    previewItemLineStrong: {
      width: "72%",
      height: 7,
      borderRadius: 4,
      backgroundColor: t.colors.textDark,
      opacity: 0.18,
    },
    previewItemLine: {
      width: "54%",
      height: 6,
      borderRadius: 4,
      backgroundColor: t.colors.IconColorGray,
      opacity: 0.45,
    },
    previewItemBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    previewItemDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: t.colors.IconColorGray,
      opacity: 0.5,
    },
    previewItemPill: {
      width: 28,
      height: 9,
      borderRadius: 5,
      backgroundColor: t.colors.primary,
      opacity: 0.3,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingBottom: Math.max(bottomInset, t.spacing.md) + t.spacing.sm,
      backgroundColor: t.colors.background,
    },
  });
}
