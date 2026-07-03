import { Icon } from "@/src/components/Icon";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import {
  createRoundedSurfaceStyle,
  ROUNDED_SURFACE_RADIUS,
} from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  getCategoryInfoForPurchaseRequest,
  PurchaseRequestCategoryInfo,
} from "@/src/services/purchase.request.service";
import { Theme, useTheme } from "@/src/themes";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

type CategoryInfoState =
  | {
      status: "loading";
    }
  | {
      status: "loaded";
      data: PurchaseRequestCategoryInfo;
    }
  | {
      status: "error";
      message: string;
    };

type CategoryInfoContent = {
  categoryName: string;
  categoryPath: string;
};

function parseStringParam(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

function formatPath(raw: string | null | undefined) {
  const value = raw?.trim();
  if (!value) return null;
  return value.replace(/\s*>\s*/g, " > ");
}

function CategoryInfoLoadedContent({ content }: { content: CategoryInfoContent }) {
  return (
    <>
      <GroupedListSection title="Categoría asignada">
        <GroupedListRow
          icon="tag"
          label={content.categoryName}
          description={content.categoryPath}
          showChevron={false}
          showSeparator={false}
        />
      </GroupedListSection>

      <GroupedListSection title="Cómo ayuda">
        <GroupedListRow
          icon="sparkles"
          label="Encuentra vendedores relevantes"
          description="La categoría ayuda a mostrar la solicitud a negocios que venden este tipo de producto."
          descriptionMaxLines={3}
        />
        <GroupedListRow
          icon="folder-closed"
          label="Ordena la información"
          description="Mantiene la solicitud dentro de una ruta clara para comparar necesidades similares."
          descriptionMaxLines={3}
        />
        <GroupedListRow
          icon="handshake"
          label="Mejora las ofertas"
          description="Da contexto para que los vendedores preparen respuestas más precisas."
          descriptionMaxLines={3}
          showSeparator={false}
        />
      </GroupedListSection>
    </>
  );
}

export default function CategoryInfoScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createCategoryInfoStyles(t, topContentInset),
    [t, topContentInset]
  );
  const params = useLocalSearchParams<{
    purchaseRequestId?: string | string[];
  }>();
  const purchaseRequestId = parseStringParam(params.purchaseRequestId);
  const [state, setState] = useState<CategoryInfoState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    const loadCategoryInfo = async () => {
      if (!purchaseRequestId) {
        setState({
          status: "error",
          message: "No encontramos esta solicitud.",
        });
        return;
      }

      setState({ status: "loading" });
      const result = await getCategoryInfoForPurchaseRequest(purchaseRequestId);
      if (!active) return;

      if (!result) {
        setState({
          status: "error",
          message: "No encontramos esta solicitud.",
        });
        return;
      }

      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }

      setState({ status: "loaded", data: result.data });
    };

    void loadCategoryInfo();
    return () => {
      active = false;
    };
  }, [purchaseRequestId]);

  const content = useMemo<CategoryInfoContent | null>(() => {
    if (state.status !== "loaded") return null;
    const request = state.data.purchaseRequest;
    const lineagePath =
      state.data.lineage.length > 0
        ? state.data.lineage.map((item) => item.name).join(" > ")
        : null;

    return {
      categoryName: request.category_name?.trim() || "Sin categoría",
      categoryPath: lineagePath ?? formatPath(request.category_path) ?? "Sin ruta configurada",
    };
  }, [state]);

  if (state.status === "loading") {
    return <LoadingState label="Cargando categoría..." style={s.loadingBox} />;
  }

  if (state.status === "error") {
    return (
      <View style={s.centerState}>
        <View style={s.emptyIconBadge}>
          <Icon name="circle-help" size={28} color={t.colors.stateAnulated} />
        </View>
        <Text color="stateAnulated" align="center">
          {state.message}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      {content ? <CategoryInfoLoadedContent content={content} /> : null}
    </ScrollView>
  );
}

function createCategoryInfoStyles(t: Theme, topContentInset = 0) {
  return StyleSheet.create({
    content: {
      gap: t.spacing.lg,
      paddingTop: topContentInset + t.spacing.md,
      paddingBottom: t.spacing.xl,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
      paddingHorizontal: t.spacing.lg,
    },
    emptyIconBadge: {
      width: 56,
      height: 56,
      borderRadius: ROUNDED_SURFACE_RADIUS,
      alignItems: "center",
      justifyContent: "center",
      ...createRoundedSurfaceStyle(t),
      borderWidth: 1,
      borderColor: t.colors.border,
    },
  });
}
