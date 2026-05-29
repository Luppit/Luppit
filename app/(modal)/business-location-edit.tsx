import Button from "@/src/components/button/Button";
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

type SelectOption = {
  code: string;
  label: string;
};

export default function BusinessLocationEditScreen() {
  const t = useTheme();
  const s = useMemo(() => createBusinessLocationEditStyles(t), [t]);
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
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <View style={s.surface}>
        <View style={s.iconBadge}>
          <Icon name="map-pin" size={22} color={t.colors.primary} />
        </View>

        <View style={s.titleBlock}>
          <Text variant="subtitle">Ubicación del negocio</Text>
          <Text color="stateAnulated">
            Selecciona la provincia, cantón y distrito donde opera tu negocio.
          </Text>
        </View>

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
          <View style={s.emptyState}>
            <Text color="stateAnulated" align="center">
              No encontramos ubicaciones disponibles.
            </Text>
          </View>
        ) : (
          <>
            <LocationSection title="Provincia">
              {provinceOptions.map((option) => (
                <LocationOptionRow
                  key={option.code}
                  label={option.label}
                  selected={option.code === selectedProvinceCode}
                  onPress={() => {
                    setSelectedProvinceCode(option.code);
                    setSelectedCantonCode(null);
                    setSelectedLocationId(null);
                  }}
                />
              ))}
            </LocationSection>

            <LocationSection title="Cantón">
              {selectedProvinceCode ? (
                cantonOptions.map((option) => (
                  <LocationOptionRow
                    key={option.code}
                    label={option.label}
                    selected={option.code === selectedCantonCode}
                    onPress={() => {
                      setSelectedCantonCode(option.code);
                      setSelectedLocationId(null);
                    }}
                  />
                ))
              ) : (
                <DisabledOptionLabel label="Primero selecciona una provincia" />
              )}
            </LocationSection>

            <LocationSection title="Distrito">
              {selectedCantonCode ? (
                districtOptions.map((option) => (
                  <LocationOptionRow
                    key={option.id}
                    label={option.label}
                    description={formatLocationLabel(option.location)}
                    selected={option.id === selectedLocationId}
                    onPress={() => setSelectedLocationId(option.id)}
                  />
                ))
              ) : (
                <DisabledOptionLabel label="Primero selecciona un cantón" />
              )}
            </LocationSection>
          </>
        )}

        <Button
          title="Guardar cambios"
          loading={isSaving}
          disabled={!canSave}
          onPress={() => void saveLocation()}
        />
      </View>
    </ScrollView>
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

function LocationSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessLocationEditStyles(t), [t]);

  return (
    <View style={s.section}>
      <Text variant="subtitle">{title}</Text>
      <View style={s.optionGroup}>{children}</View>
    </View>
  );
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
  onPress,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessLocationEditStyles(t), [t]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={s.optionRow}
    >
      <View style={s.optionText}>
        <Text maxLines={1}>{label}</Text>
        {description ? (
          <Text variant="caption" color="stateAnulated" maxLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[s.checkCircle, selected ? s.checkCircleSelected : null]}>
        {selected ? <Icon name="check" size={16} color={t.colors.backgroudWhite} /> : null}
      </View>
    </Pressable>
  );
}

function createBusinessLocationEditStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    surface: {
      backgroundColor: t.colors.backgroudWhite,
      borderRadius: t.borders.md,
      padding: t.spacing.lg,
      gap: t.spacing.md,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 5,
      elevation: 2,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: "rgba(131,163,30,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    titleBlock: {
      gap: t.spacing.xs,
    },
    warningBox: {
      borderWidth: 1,
      borderColor: "rgba(202,115,48,0.28)",
      borderRadius: t.borders.sm,
      backgroundColor: "rgba(202,115,48,0.08)",
      padding: t.spacing.sm,
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
    section: {
      gap: t.spacing.sm,
    },
    optionGroup: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    optionRow: {
      minHeight: 52,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    disabledRow: {
      minHeight: 52,
      paddingVertical: t.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
      justifyContent: "center",
    },
    optionText: {
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
  });
}
