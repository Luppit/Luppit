import Button from "@/src/components/button/Button";
import { GroupedListSection } from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import {
  LocationOption,
  formatLocationLabel,
  getActiveBusinessLocations,
} from "@/src/services/location.service";
import { updateCurrentBusinessLocation } from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "../(detail)/detail-top-bar";

type SelectOption = {
  code: string;
  label: string;
};

export default function BusinessLocationEditScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createBusinessLocationEditStyles(t, insets.bottom, topContentInset),
    [insets.bottom, t, topContentInset]
  );
  const params = useLocalSearchParams<{
    locationId?: string | string[];
    locationLabel?: string | string[];
  }>();
  const initialLocationId = getParamValue(params.locationId) || null;
  const initialLocationLabel = getParamValue(params.locationLabel);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string | null>(null);
  const [selectedCantonCode, setSelectedCantonCode] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadLocations = async () => {
      setIsLoading(true);
      const result = await getActiveBusinessLocations();
      if (!active) return;

      if (!result.ok) {
        setLocations([]);
        setIsLoading(false);
        showError("No se pudo cargar la ubicación", result.error.message);
        return;
      }

      const nextLocations = result.data;
      const currentLocation = initialLocationId
        ? nextLocations.find((location) => location.id === initialLocationId) ?? null
        : null;

      setLocations(nextLocations);
      setSelectedProvinceCode(currentLocation?.province_code ?? null);
      setSelectedCantonCode(currentLocation?.canton_code ?? null);
      setSelectedLocationId(currentLocation?.id ?? null);
      setIsLoading(false);
    };

    void loadLocations();

    return () => {
      active = false;
    };
  }, [initialLocationId]);

  const provinceOptions = useMemo(
    () => getUniqueOptions(locations, "province_code", "province"),
    [locations]
  );
  const cantonOptions = useMemo(
    () =>
      getUniqueOptions(
        locations.filter((location) => location.province_code === selectedProvinceCode),
        "canton_code",
        "canton"
      ),
    [locations, selectedProvinceCode]
  );
  const districtOptions = useMemo(
    () =>
      locations
        .filter(
          (location) =>
            location.province_code === selectedProvinceCode &&
            location.canton_code === selectedCantonCode &&
            typeof location.district === "string" &&
            location.district.trim().length > 0
        )
        .map((location) => ({
          id: location.id,
          code: location.district_code ?? location.territorial_code ?? location.id,
          label: location.district?.trim() ?? "",
          location,
        })),
    [locations, selectedCantonCode, selectedProvinceCode]
  );
  const currentLocationIsSelectable = initialLocationId
    ? locations.some((location) => location.id === initialLocationId)
    : true;
  const canSave =
    Boolean(selectedLocationId) &&
    selectedLocationId !== initialLocationId &&
    !isLoading &&
    !isSaving;

  const saveLocation = async () => {
    if (!selectedLocationId || !canSave) return;

    setIsSaving(true);
    const result = await updateCurrentBusinessLocation(selectedLocationId);
    setIsSaving(false);

    if (!result.ok) {
      showError("No se pudo actualizar la ubicación", result.error.message);
      return;
    }

    showSuccess("Ubicación actualizada");
    router.back();
  };

  if (isLoading) {
    return <LoadingState label="Cargando ubicaciones..." style={s.loadingBox} />;
  }

  return (
    <View style={s.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        {!currentLocationIsSelectable ? (
          <View style={s.warningBox}>
            <Icon name="alert-circle" size={18} color={t.colors.secondary} />
            <View style={s.warningText}>
              {initialLocationLabel ? (
                <Text maxLines={2}>{initialLocationLabel}</Text>
              ) : null}
              <Text color="stateAnulated">
                Esta ubicación ya no está disponible. Selecciona una ubicación válida para actualizarla.
              </Text>
            </View>
          </View>
        ) : null}

        {locations.length === 0 ? (
          <GroupedListSection title="Ubicación">
            <View style={s.emptyState}>
              <Text color="stateAnulated" align="center">
                No encontramos ubicaciones disponibles.
              </Text>
            </View>
          </GroupedListSection>
        ) : (
          <>
            <GroupedListSection title="Provincia">
              {provinceOptions.map((option, index) => (
                <LocationOptionRow
                  key={option.code}
                  label={option.label}
                  selected={option.code === selectedProvinceCode}
                  showSeparator={index < provinceOptions.length - 1}
                  onPress={() => {
                    setSelectedProvinceCode(option.code);
                    setSelectedCantonCode(null);
                    setSelectedLocationId(null);
                  }}
                />
              ))}
            </GroupedListSection>

            <GroupedListSection title="Cantón">
              {selectedProvinceCode ? (
                cantonOptions.map((option, index) => (
                  <LocationOptionRow
                    key={option.code}
                    label={option.label}
                    selected={option.code === selectedCantonCode}
                    showSeparator={index < cantonOptions.length - 1}
                    onPress={() => {
                      setSelectedCantonCode(option.code);
                      setSelectedLocationId(null);
                    }}
                  />
                ))
              ) : (
                <DisabledOptionLabel label="Primero selecciona una provincia" />
              )}
            </GroupedListSection>

            <GroupedListSection title="Distrito">
              {selectedCantonCode ? (
                districtOptions.map((option, index) => (
                  <LocationOptionRow
                    key={option.id}
                    label={option.label}
                    description={formatLocationLabel(option.location)}
                    selected={option.id === selectedLocationId}
                    showSeparator={index < districtOptions.length - 1}
                    onPress={() => setSelectedLocationId(option.id)}
                  />
                ))
              ) : (
                <DisabledOptionLabel label="Primero selecciona un cantón" />
              )}
            </GroupedListSection>
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        <Button
          title="Guardar cambios"
          loading={isSaving}
          disabled={!canSave}
          onPress={() => void saveLocation()}
        />
      </View>
    </View>
  );
}

function getParamValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function getUniqueOptions<KCode extends keyof LocationOption, KLabel extends keyof LocationOption>(
  locations: LocationOption[],
  codeKey: KCode,
  labelKey: KLabel
) {
  const options = new Map<string, SelectOption>();

  for (const location of locations) {
    const code = location[codeKey];
    const label = location[labelKey];
    if (typeof code !== "string" || typeof label !== "string") continue;

    const normalizedCode = code.trim();
    const normalizedLabel = label.trim();
    if (!normalizedCode || !normalizedLabel || options.has(normalizedCode)) continue;

    options.set(normalizedCode, {
      code: normalizedCode,
      label: normalizedLabel,
    });
  }

  return Array.from(options.values());
}

function DisabledOptionLabel({ label }: { label: string }) {
  const t = useTheme();
  const s = useMemo(() => createBusinessLocationEditStyles(t), [t]);

  return (
    <View style={s.disabledRow}>
      <Text color="stateAnulated">{label}</Text>
    </View>
  );
}

function LocationOptionRow({
  label,
  description,
  selected,
  showSeparator,
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  showSeparator: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessLocationEditStyles(t), [t]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[s.optionRow, description ? s.optionRowWithDescription : null]}
    >
      <View style={s.optionText}>
        <Text variant="body" maxLines={2}>
          {label}
        </Text>
        {description ? (
          <Text variant="small" color="stateAnulated" maxLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[s.checkCircle, selected ? s.checkCircleSelected : null]}>
        {selected ? <Icon name="check" size={16} color={t.colors.backgroudWhite} /> : null}
      </View>
      {showSeparator ? <View style={s.rowSeparator} /> : null}
    </Pressable>
  );
}

function createBusinessLocationEditStyles(
  t: Theme,
  bottomInset = 0,
  topContentInset = 0
) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      gap: t.spacing.lg,
      paddingTop: topContentInset + t.spacing.sm,
      paddingBottom: 96 + bottomInset,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
    warningBox: {
      borderRadius: t.borders.md,
      backgroundColor: "rgba(202,115,48,0.08)",
      padding: t.spacing.md,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.sm,
    },
    warningText: {
      flex: 1,
      gap: 2,
    },
    emptyState: {
      minHeight: 120,
      alignItems: "center",
      justifyContent: "center",
      padding: t.spacing.md,
    },
    optionRow: {
      minHeight: 58,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    optionRowWithDescription: {
      minHeight: 74,
    },
    disabledRow: {
      minHeight: 58,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      justifyContent: "center",
    },
    optionText: {
      flex: 1,
      minWidth: 0,
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
    rowSeparator: {
      position: "absolute",
      left: t.spacing.md,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(0,0,0,0.08)",
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: t.spacing.sm,
      paddingBottom: Math.max(bottomInset, t.spacing.md) + t.spacing.sm,
      backgroundColor: t.colors.background,
    },
  });
}
