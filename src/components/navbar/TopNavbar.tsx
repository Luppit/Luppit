import { TextField } from "@/src/components/inputField/InputField";
import RoleGate from "@/src/components/role/RoleGate";
import { Text } from "@/src/components/Text";
import { getSession } from "@/src/lib/supabase";
import {
  clearBuyerHomeFilters,
  getBuyerHomeFilters,
  hasBuyerHomeFilters,
  setBuyerHomeFilters,
  subscribeBuyerHomeFilters,
} from "@/src/services/buyer.home.filters.service";
import {
  clearSellerHomeFilters,
  getSellerHomeFilters,
  hasSellerHomeFilters,
  SellerHomeInteractionState,
  setSellerHomeFilters,
  subscribeSellerHomeFilters,
} from "@/src/services/seller.home.filters.service";
import { openPopup } from "@/src/services/popup.service";
import { getProfileByUserId } from "@/src/services/profile.service";
import {
  BuyerHomePurchaseRequestGroup,
  getCurrentBuyerHomePurchaseRequestGroups,
  getCurrentSellerHomeFilterCategoryOptions,
  getPurchaseRequestStatusUiOptions,
  PurchaseRequestStatusUiOption,
  SellerHomeFilterCategoryOption,
} from "@/src/services/purchase.request.service";
import {
  getSelectedSegmentSvgName,
  getSegments,
  Segment,
  setSelectedSegmentSvgName,
  subscribeSelectedSegment,
} from "@/src/services/segment.service";
import { usePathname } from "expo-router";
import { Asset } from "expo-asset";
import { useTheme } from "@/src/themes/ThemeProvider";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { Icon } from "../Icon";
import { createTopNavbarStyles } from "./topNavbarStyles";

const segmentSvgModules: Record<string, number> = {
  todas: require("../../../assets/segments/todas.svg"),
  vehiculos: require("../../../assets/segments/vehiculos.svg"),
  muebles: require("../../../assets/segments/muebles.svg"),
  plantas: require("../../../assets/segments/plantas.svg"),
  herramientas: require("../../../assets/segments/herramientas.svg"),
};

const BUYER_FILTER_STATUS_FALLBACKS: PurchaseRequestStatusUiOption[] = [
  { statusCode: "active", label: "Activa" },
  { statusCode: "offer_accepted", label: "Oferta aceptada" },
];

const SELLER_INTERACTION_OPTIONS: {
  id: SellerHomeInteractionState;
  label: string;
}[] = [
  { id: "new", label: "Sin abrir" },
  { id: "opened", label: "En gestión" },
  { id: "discarded", label: "Descartadas" },
];

function mergeBuyerStatusOptions(
  ...sources: PurchaseRequestStatusUiOption[][]
): PurchaseRequestStatusUiOption[] {
  const map = new Map<string, PurchaseRequestStatusUiOption>();

  [...sources, BUYER_FILTER_STATUS_FALLBACKS].forEach((items) => {
    items.forEach((item) => {
      const statusCode = item.statusCode?.trim();
      const label = item.label?.trim();
      if (!statusCode || !label || map.has(statusCode)) return;
      map.set(statusCode, { statusCode, label });
    });
  });

  return Array.from(map.values());
}

function buildFallbackBuyerStatusOptions(
  groups: BuyerHomePurchaseRequestGroup[]
): PurchaseRequestStatusUiOption[] {
  const map = new Map<string, PurchaseRequestStatusUiOption>();

  groups.forEach((group) => {
    group.items.forEach((item) => {
      const label = item.status_label?.trim();
      const statusCode = item.status?.trim();
      if (!label || !statusCode || map.has(statusCode)) return;
      map.set(statusCode, {
        statusCode,
        label,
      });
    });
  });

  return Array.from(map.values());
}

function SharedTopNavbarContent({ role }: { role: "buyer" | "seller" }) {
  const t = useTheme();
  const s = useMemo(() => createTopNavbarStyles(t), [t]);
  const pathname = usePathname();
  const segmentIconUris = useMemo(() => {
    const uris: Record<string, string> = {};
    for (const [svgName, moduleRef] of Object.entries(segmentSvgModules)) {
      uris[svgName] = Asset.fromModule(moduleRef).uri;
    }
    return uris;
  }, []);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegmentSvgName, setSelectedSegmentSvgNameState] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [homeFilters, setHomeFilters] = useState(getBuyerHomeFilters());
  const [sellerHomeFilters, setSellerHomeFiltersState] = useState(getSellerHomeFilters());
  const [profileName, setProfileName] = useState("Mi perfil");
  const [buyerStatusOptions, setBuyerStatusOptions] = useState<PurchaseRequestStatusUiOption[]>([]);
  const [sellerCategoryOptions, setSellerCategoryOptions] = useState<
    SellerHomeFilterCategoryOption[]
  >([]);
  const [failedSegmentIcons, setFailedSegmentIcons] = useState<Record<string, true>>({});
  const isHomeRoute = pathname === "/" || pathname === "/index";

  useEffect(() => {
    return subscribeBuyerHomeFilters(setHomeFilters);
  }, []);

  useEffect(() => {
    return subscribeSellerHomeFilters(setSellerHomeFiltersState);
  }, []);

  useEffect(() => {
    return subscribeSelectedSegment(setSelectedSegmentSvgNameState);
  }, []);

  useEffect(() => {
    let active = true;

    const loadProfileName = async () => {
      const session = await getSession();
      if (!session?.user.id) return;

      const profileResult = await getProfileByUserId(session.user.id);
      if (!active || !profileResult || profileResult.ok === false) return;

      const name = profileResult.data.name?.trim();
      if (name) {
        setProfileName(name);
      }
    };

    void loadProfileName();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSegments = async () => {
      const segmentResult = await getSegments();
      if (!active || segmentResult.ok === false) return;

      setSegments(segmentResult.data);
      const currentSegmentSvgName = getSelectedSegmentSvgName();
      const hasCurrentEnabled = segmentResult.data.some(
        (segment) => segment.svgName === currentSegmentSvgName && !segment.isDisabled
      );
      if (hasCurrentEnabled) return;

      const firstEnabled = segmentResult.data.find((segment) => !segment.isDisabled)?.svgName;
      const nextSegmentSvgName = firstEnabled ?? segmentResult.data[0]?.svgName ?? "";
      if (nextSegmentSvgName) {
        setSelectedSegmentSvgName(nextSegmentSvgName);
      }
    };

    void loadSegments();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (role !== "buyer") return;

    let active = true;

    const loadBuyerStatuses = async () => {
      const statusResult = await getPurchaseRequestStatusUiOptions();
      if (!active) return;

      const groupsResult = await getCurrentBuyerHomePurchaseRequestGroups(
        undefined,
        selectedSegmentSvgName
      );
      if (!active) return;

      const groupedOptions = groupsResult.ok
        ? buildFallbackBuyerStatusOptions(groupsResult.data)
        : [];

      setBuyerStatusOptions(
        mergeBuyerStatusOptions(statusResult.ok ? statusResult.data : [], groupedOptions)
      );
    };

    void loadBuyerStatuses();

    return () => {
      active = false;
    };
  }, [role, selectedSegmentSvgName]);

  useEffect(() => {
    if (role !== "seller") return;

    let active = true;

    const loadSellerCategories = async () => {
      const categoryResult = await getCurrentSellerHomeFilterCategoryOptions(
        selectedSegmentSvgName
      );
      if (!active || !categoryResult.ok) return;

      setSellerCategoryOptions(categoryResult.data);
    };

    void loadSellerCategories();

    return () => {
      active = false;
    };
  }, [role, selectedSegmentSvgName]);

  const openFiltersPopup = useCallback(async () => {
    if (role === "buyer") {
      let statusOptions = buyerStatusOptions;

      const statusResult = await getPurchaseRequestStatusUiOptions();
      const groupsResult = await getCurrentBuyerHomePurchaseRequestGroups(
        undefined,
        selectedSegmentSvgName
      );
      const groupedOptions = groupsResult.ok
        ? buildFallbackBuyerStatusOptions(groupsResult.data)
        : [];

      statusOptions = mergeBuyerStatusOptions(
        statusResult.ok ? statusResult.data : [],
        groupedOptions,
        statusOptions
      );
      setBuyerStatusOptions(statusOptions);

      openPopup({
        type: "filters",
        title: "Filtros",
        searchField: {
          label: "Nombre de la solicitud",
          placeholder: "Buscar",
          initialValue: homeFilters.searchValue,
        },
        dateRangeField: {
          label: "Rango de fechas",
          startPlaceholder: "Desde",
          endPlaceholder: "Hasta",
          initialStartValue: homeFilters.startDate,
          initialEndValue: homeFilters.endDate,
        },
        chipGroup: {
          label: "Estado de la solicitud",
          options: statusOptions.map((status) => ({
            id: status.statusCode,
            label: status.label,
          })),
          initialSelectedIds: homeFilters.selectedChipIds,
        },
        clearLabel: "Limpiar",
        applyLabel: "Aplicar",
        onClear: clearBuyerHomeFilters,
        onApply: setBuyerHomeFilters,
      });
      return;
    }

    const categoryResult = await getCurrentSellerHomeFilterCategoryOptions(
      selectedSegmentSvgName
    );
    const nextCategoryOptions = categoryResult.ok ? categoryResult.data : sellerCategoryOptions;
    setSellerCategoryOptions(nextCategoryOptions);

    openPopup({
      type: "filters",
      title: "Filtros",
      searchField: {
        label: "Nombre de la solicitud",
        placeholder: "Buscar",
        initialValue: sellerHomeFilters.searchValue,
      },
      dateRangeField: {
        label: "Rango de fechas",
        startPlaceholder: "Desde",
        endPlaceholder: "Hasta",
        initialStartValue: sellerHomeFilters.startDate,
        initialEndValue: sellerHomeFilters.endDate,
      },
      chipGroups: [
        {
          id: "categories",
          label: "Categoría",
          options: nextCategoryOptions.map((category) => ({
            id: category.id,
            label: category.label,
          })),
          initialSelectedIds: sellerHomeFilters.selectedCategoryIds,
        },
        {
          id: "interactionStates",
          label: "Estado en tu negocio",
          options: SELLER_INTERACTION_OPTIONS,
          initialSelectedIds: sellerHomeFilters.selectedInteractionStates,
        },
      ],
      clearLabel: "Limpiar",
      applyLabel: "Aplicar",
      onClear: clearSellerHomeFilters,
      onApply: (values) => {
        const selectedGroups = values.selectedChipGroupIds ?? {};
        setSellerHomeFilters({
          searchValue: values.searchValue,
          startDate: values.startDate,
          endDate: values.endDate,
          selectedCategoryIds: selectedGroups.categories ?? [],
          selectedInteractionStates: (selectedGroups.interactionStates ??
            []) as SellerHomeInteractionState[],
        });
      },
    });
  }, [
    buyerStatusOptions,
    homeFilters,
    role,
    selectedSegmentSvgName,
    sellerCategoryOptions,
    sellerHomeFilters,
  ]);

  return (
    <View style={s.container}>
      <Pressable onPress={() => console.log("open profile switcher")}>
        <View style={s.profileRow}>
          <Text variant="subtitle">{profileName}</Text>
          <Icon name="chevron-down" size={18} />
          <View style={s.onlineDot} />
        </View>
      </Pressable>

      {isHomeRoute ? (
        <>
          <Pressable style={s.searchTrigger} onPress={() => void openFiltersPopup()}>
            <Icon name="search" size={20} color={t.colors.stateAnulated} />
            <Text variant="body" style={s.searchTriggerText}>
              Buscar en Luppit
            </Text>
          </Pressable>

          {role === "buyer" && hasBuyerHomeFilters(homeFilters) ? (
            <View style={s.activeFilterChip}>
              <Icon name="sliders-horizontal" size={16} color={t.colors.textDark} />
              <Text variant="body" style={s.activeFilterChipLabel}>
                Filtros (1)
              </Text>
              <Pressable style={s.activeFilterChipClose} onPress={clearBuyerHomeFilters}>
                <Icon name="x" size={16} color={t.colors.textDark} />
              </Pressable>
            </View>
          ) : null}

          {role === "seller" && hasSellerHomeFilters(sellerHomeFilters) ? (
            <View style={s.activeFilterChip}>
              <Icon name="sliders-horizontal" size={16} color={t.colors.textDark} />
              <Text variant="body" style={s.activeFilterChipLabel}>
                Filtros (1)
              </Text>
              <Pressable style={s.activeFilterChipClose} onPress={clearSellerHomeFilters}>
                <Icon name="x" size={16} color={t.colors.textDark} />
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <TextField
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder="Busca en Luppit"
          leftIcon="search"
          baseContainerStyle={{ marginBottom: 0 }}
          inputContainerStyle={s.searchInputContainer}
        />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryListContainer}
      >
        {segments.map((segment) => {
          const segmentIconUri = segmentIconUris[segment.svgName];

          return (
            <Pressable
              key={segment.svgName}
              disabled={segment.isDisabled}
              onPress={() => {
                if (segment.isDisabled) return;
                setSelectedSegmentSvgName(segment.svgName);
              }}
              style={[
                s.categoryButton,
                selectedSegmentSvgName === segment.svgName &&
                  !segment.isDisabled &&
                  s.categoryButtonActive,
                segment.isDisabled && s.categoryButtonDisabled,
              ]}
            >
              <View style={s.categoryImageContainer}>
                {!segmentIconUri || failedSegmentIcons[segment.svgName] ? (
                  <Image
                    source={require("../../../assets/images/icon.png")}
                    style={s.categoryImage}
                  />
                ) : (
                  <SvgUri
                    uri={segmentIconUri}
                    width={34}
                    height={34}
                    onError={() =>
                      setFailedSegmentIcons((current) =>
                        current[segment.svgName]
                          ? current
                          : { ...current, [segment.svgName]: true }
                      )
                    }
                  />
                )}
              </View>
              <Text color={segment.isDisabled ? "IconColorGray" : "textDark"}>
                {segment.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TopNavbar() {
  return (
    <RoleGate
      buyer={<SharedTopNavbarContent role="buyer" />}
      seller={<SharedTopNavbarContent role="seller" />}
      loading={null}
    />
  );
}
