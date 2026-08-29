import Button from "@/src/components/button/Button";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import {
  createRoundedSurfaceStyle,
  ROUNDED_SURFACE_RADIUS,
} from "@/src/components/surface/styles";
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BusinessLocationEditScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { state: activeProfileState, activeProfile } = useActiveProfile();
  const isBusinessOwner = activeProfile?.membershipRole === "owner";
  const s = useMemo(
    () => createBusinessLocationEditStyles(t, insets.bottom),
    [insets.bottom, t]
  );
  const params = useLocalSearchParams<{
    locationId?: string | string[];
    locationLabel?: string | string[];
  }>();
  const initialLocationId = getParamValue(params.locationId) || null;
  const initialLocationLabel = getParamValue(params.locationLabel);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isMountedRef = useRef(true);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadLocations = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;

    if (!isBusinessOwner) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    const result = await getActiveBusinessLocations();
    if (!isMountedRef.current || loadRequestIdRef.current !== requestId) return;

    if (!result.ok) {
      setLocations([]);
      setSelectedLocationId(null);
      setLoadError(true);
      setIsLoading(false);
      return;
    }

    const nextLocations = result.data;
    const currentLocation = initialLocationId
      ? nextLocations.find((location) => location.id === initialLocationId) ?? null
      : null;

    setLocations(nextLocations);
    setSelectedLocationId(currentLocation?.id ?? null);
    setIsLoading(false);
  }, [initialLocationId, isBusinessOwner]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const selectableLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          typeof location.district === "string" &&
          location.district.trim().length > 0
      ),
    [locations]
  );
  const normalizedQuery = normalizeSearchText(searchQuery);
  const filteredLocations = useMemo(() => {
    if (!normalizedQuery) return selectableLocations;

    return selectableLocations.filter((location) =>
      normalizeSearchText(formatLocationLabel(location)).includes(normalizedQuery)
    );
  }, [normalizedQuery, selectableLocations]);
  const selectedLocation = useMemo(
    () =>
      selectableLocations.find((location) => location.id === selectedLocationId) ??
      null,
    [selectableLocations, selectedLocationId]
  );
  const currentLocationIsSelectable = initialLocationId
    ? selectableLocations.some((location) => location.id === initialLocationId)
    : true;
  const canSave =
    Boolean(selectedLocationId) &&
    selectedLocationId !== initialLocationId &&
    !isLoading &&
    !isSaving;

  const selectLocation = useCallback((location: LocationOption) => {
    setSelectedLocationId(location.id);
    AccessibilityInfo.announceForAccessibility(
      `Ubicación seleccionada: ${formatLocationLabel(location)}`
    );
  }, []);

  const saveLocation = async () => {
    if (!isBusinessOwner) {
      showError(
        "Acceso restringido",
        "Solo el administrador principal puede cambiar la ubicación del negocio."
      );
      return;
    }

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

  if (activeProfileState !== "loading" && !isBusinessOwner) {
    return (
      <View style={s.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.restrictedContent}
        >
          <GroupedListSection title="Ubicación del negocio">
            <GroupedListRow
              icon="lock"
              label="Solo para el administrador principal"
              description="Tu perfil puede consultar la ubicación, pero solo el administrador principal puede cambiarla."
              descriptionMaxLines={3}
              showSeparator={false}
            />
          </GroupedListSection>
        </ScrollView>
      </View>
    );
  }

  if (activeProfileState === "loading" || isLoading) {
    return <LoadingState label="Cargando ubicaciones..." style={s.loadingBox} />;
  }

  if (loadError) {
    return (
      <View style={s.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.restrictedContent}
        >
          <GroupedListSection title="Ubicación">
            <View style={s.errorState} accessibilityLiveRegion="polite">
              <Icon name="map-pin" size={28} color={t.colors.stateAnulated} />
              <Text align="center">No pudimos cargar las ubicaciones.</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Intentar cargar las ubicaciones de nuevo"
                onPress={() => void loadLocations()}
                style={s.inlineAction}
              >
                <Text color="primary">Intentar de nuevo</Text>
              </Pressable>
            </View>
          </GroupedListSection>
        </ScrollView>
      </View>
    );
  }

  const selectedDistrict = selectedLocation?.district?.trim() || "Selecciona una ubicación";
  const selectedParentLabel = selectedLocation
    ? formatParentLocationLabel(selectedLocation)
    : null;
  const trimmedQuery = searchQuery.trim();

  return (
    <View style={s.container}>
      <FlatList
        accessible={false}
        data={filteredLocations}
        keyExtractor={(location) => location.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View style={s.listHeader}>
            {!currentLocationIsSelectable ? (
              <View style={s.warningBox} accessibilityLiveRegion="polite">
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

            <GroupedListSection title="Ubicación seleccionada">
              <GroupedListRow
                icon="map-pin"
                label={selectedDistrict}
                description={selectedParentLabel}
                descriptionColor="textMedium"
                descriptionMaxLines={3}
                showSeparator={false}
              />
            </GroupedListSection>

            <View style={s.searchSection}>
              <Text variant="small" color="textMedium" style={s.sectionTitle}>
                Buscar ubicación
              </Text>
              <TextField
                accessibilityLabel="Buscar distrito, cantón o provincia"
                accessibilityRole="search"
                autoCapitalize="words"
                autoCorrect={false}
                clearButtonMode="while-editing"
                leftIcon="search"
                placeholder="Buscar distrito, cantón o provincia"
                returnKeyType="search"
                value={searchQuery}
                onChangeText={setSearchQuery}
                baseContainerStyle={s.searchField}
              />
            </View>

            <Text variant="small" color="textMedium" style={s.sectionTitle}>
              Ubicaciones
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyState} accessibilityLiveRegion="polite">
            <Text color="stateAnulated" align="center">
              {trimmedQuery
                ? `No encontramos ubicaciones para “${trimmedQuery}”.`
                : "No encontramos ubicaciones disponibles."}
            </Text>
            {trimmedQuery ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSearchQuery("")}
                style={s.inlineAction}
              >
                <Text color="primary">Limpiar búsqueda</Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <LocationOptionRow
            location={item}
            selected={item.id === selectedLocationId}
            isFirst={index === 0}
            isLast={index === filteredLocations.length - 1}
            onPress={() => selectLocation(item)}
          />
        )}
      />

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

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CR")
    .trim();
}

function formatParentLocationLabel(location: LocationOption) {
  const parts = [location.canton, location.province]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  const uniqueParts = parts.filter(
    (part, index) =>
      parts.findIndex(
        (candidate) => candidate.localeCompare(part, "es", { sensitivity: "base" }) === 0
      ) === index
  );

  return uniqueParts.join(", ") || null;
}

function LocationOptionRow({
  location,
  selected,
  isFirst,
  isLast,
  onPress,
}: {
  location: LocationOption;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessLocationEditStyles(t), [t]);
  const label = location.district?.trim() || "Distrito sin nombre";
  const description = formatParentLocationLabel(location);
  const accessibilityLabel = formatLocationLabel(location);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        selected ? "Ubicación seleccionada." : "Selecciona esta ubicación."
      }
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        s.optionRow,
        isFirst ? s.optionRowFirst : null,
        isLast ? s.optionRowLast : null,
      ]}
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
      {!isLast ? <View style={s.rowSeparator} /> : null}
    </Pressable>
  );
}

function createBusinessLocationEditStyles(t: Theme, bottomInset = 0) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingTop: t.spacing.lg,
      paddingBottom: 96 + bottomInset,
    },
    restrictedContent: {
      flexGrow: 1,
      gap: t.spacing.lg,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.xl + bottomInset,
    },
    listHeader: {
      gap: t.spacing.lg,
      marginBottom: t.spacing.sm,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
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
    searchSection: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      paddingLeft: t.spacing.md,
    },
    searchField: {
      marginBottom: 0,
    },
    errorState: {
      minHeight: 168,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      padding: t.spacing.lg,
    },
    emptyState: {
      minHeight: 136,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      padding: t.spacing.lg,
      ...createRoundedSurfaceStyle(t),
    },
    inlineAction: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.spacing.md,
    },
    optionRow: {
      minHeight: 74,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      backgroundColor: t.colors.backgroudWhite,
    },
    optionRowFirst: {
      borderTopLeftRadius: ROUNDED_SURFACE_RADIUS,
      borderTopRightRadius: ROUNDED_SURFACE_RADIUS,
    },
    optionRowLast: {
      borderBottomLeftRadius: ROUNDED_SURFACE_RADIUS,
      borderBottomRightRadius: ROUNDED_SURFACE_RADIUS,
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
