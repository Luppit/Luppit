import { Icon } from "@/src/components/Icon";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  BuyerBusinessReview,
  BuyerVisibleBusinessOverview,
  getCurrentBuyerVisibleBusinessOverviewByConversation,
  getCurrentBuyerVisibleBusinessOverviewByOffer,
} from "@/src/services/business.service";
import { formatLocationLabel } from "@/src/services/location.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { useGlobalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

function parseStringParam(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value.trim();
  return trimmed || null;
}

export default function SellerBusinessScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createSellerBusinessStyles(t, topContentInset),
    [t, topContentInset]
  );
  const params = useGlobalSearchParams<{
    conversationId?: string | string[];
    purchaseRequestId?: string | string[];
    purchaseOfferId?: string | string[];
  }>();
  const conversationId = parseStringParam(params.conversationId);
  const purchaseRequestId = parseStringParam(params.purchaseRequestId);
  const purchaseOfferId = parseStringParam(params.purchaseOfferId);
  const [overview, setOverview] = useState<BuyerVisibleBusinessOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const result = conversationId
      ? await getCurrentBuyerVisibleBusinessOverviewByConversation(conversationId)
      : purchaseRequestId && purchaseOfferId
        ? await getCurrentBuyerVisibleBusinessOverviewByOffer(
            purchaseRequestId,
            purchaseOfferId
          )
        : null;

    if (!result) {
      setOverview(null);
      setLoadError("No encontramos una oferta o conversación asociada.");
      setIsLoading(false);
      return;
    }

    if (!result.ok) {
      setOverview(null);
      setLoadError(result.error.message);
      setIsLoading(false);
      showError("No se pudo cargar el negocio", result.error.message);
      return;
    }

    setOverview(result.data);
    setIsLoading(false);
  }, [conversationId, purchaseOfferId, purchaseRequestId]);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
      return () => {};
    }, [loadOverview])
  );

  if (isLoading) {
    return <LoadingState label="Cargando negocio..." style={s.loadingBox} />;
  }

  if (!overview || loadError) {
    return (
      <View style={s.emptyState}>
        <View style={s.emptyIcon}>
          <Icon name="house" size={24} color={t.colors.stateAnulated} />
        </View>
        <Text variant="subtitle" align="center">
          No se pudo cargar el negocio
        </Text>
        <Text color="stateAnulated" align="center">
          {loadError ?? "Intenta abrirlo de nuevo desde la oferta o conversación."}
        </Text>
      </View>
    );
  }

  const { business, categories, ratingTags, reviews } = overview;
  const locationLabel = formatLocationLabel(business.location);
  const ratingLabel =
    business.rating != null && business.numRatings > 0
      ? `${business.rating.toFixed(1)} (${business.numRatings} calificaciones)`
      : "Sin calificaciones";
  const categoryPreview = getPreviewLabel(categories.map((category) => category.name));
  const businessSince = formatDate(business.createdAt);

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
            {categoryPreview || locationLabel || "Información del vendedor"}
          </Text>
        </View>
      </View>

      <GroupedListSection title="Datos generales">
        <GroupedListRow
          icon="house"
          label="Nombre comercial"
          value={business.name || "Sin nombre"}
        />
        <GroupedListRow icon="map-pin" label="Ubicación" value={locationLabel} />
        <GroupedListRow
          icon="file-text"
          label="Documento comercial"
          value={business.documentLabel ?? "No disponible"}
        />
        <GroupedListRow
          icon="info"
          label="En Luppit desde"
          value={businessSince}
          showSeparator={false}
        />
      </GroupedListSection>

      <GroupedListSection title="Reputación">
        <GroupedListRow
          icon="star"
          label="Rating del negocio"
          value={ratingLabel}
          showSeparator={false}
        />
      </GroupedListSection>

      <ChipSection
        title="Categorías"
        emptyLabel="Sin categorías configuradas."
        chips={categories.map((category) => category.name)}
      />

      <ChipSection
        title="Lo que destacan"
        emptyLabel="Aún no hay etiquetas destacadas."
        chips={ratingTags.map((tag) => `${tag.label} (${tag.count})`)}
      />

      <ReviewSection reviews={reviews} />
    </ScrollView>
  );
}

function ChipSection({
  title,
  emptyLabel,
  chips,
}: {
  title: string;
  emptyLabel: string;
  chips: string[];
}) {
  const t = useTheme();
  const s = useMemo(() => createSellerBusinessStyles(t), [t]);

  return (
    <View style={s.section}>
      <Text variant="small" color="textMedium" style={s.sectionTitle}>
        {title}
      </Text>
      <View style={s.surface}>
        {chips.length === 0 ? (
          <Text color="stateAnulated">{emptyLabel}</Text>
        ) : (
          <View style={s.chipRow}>
            {chips.map((chip) => (
              <View key={chip} style={s.chip}>
                <Text variant="small" maxLines={1} style={s.chipText}>
                  {chip}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function ReviewSection({ reviews }: { reviews: BuyerBusinessReview[] }) {
  const t = useTheme();
  const s = useMemo(() => createSellerBusinessStyles(t), [t]);

  return (
    <View style={s.section}>
      <Text variant="small" color="textMedium" style={s.sectionTitle}>
        Comentarios
      </Text>
      <View style={s.reviewsSurface}>
        {reviews.length === 0 ? (
          <Text color="stateAnulated">
            Este negocio todavía no tiene comentarios visibles.
          </Text>
        ) : (
          reviews.map((review, index) => (
            <View key={review.id}>
              <View style={s.reviewRow}>
                <View style={s.reviewHeader}>
                  <StarRating stars={review.stars} />
                  <Text
                    variant="small"
                    color="stateAnulated"
                    maxLines={1}
                    style={s.reviewDate}
                  >
                    {formatDate(review.createdAt)}
                  </Text>
                </View>
                <Text color="textMedium">{review.comment}</Text>
                {review.tags.length > 0 ? (
                  <View style={s.reviewTags}>
                    {review.tags.map((tag) => (
                      <Text key={tag} variant="small" color="stateAnulated">
                        {tag}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
              {index < reviews.length - 1 ? <View style={s.separator} /> : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function StarRating({ stars }: { stars: number }) {
  const t = useTheme();
  const roundedStars = Math.round(stars);

  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon
          key={index}
          name={index < roundedStars ? "star" : "star-off"}
          size={15}
          color={index < roundedStars ? t.colors.accentYellow : t.colors.border}
        />
      ))}
    </View>
  );
}

function getPreviewLabel(names: string[]) {
  const cleanNames = names.map((name) => name.trim()).filter(Boolean);
  if (cleanNames.length === 0) return "";

  const previewNames = cleanNames.slice(0, 3);
  const hiddenCount = cleanNames.length - previewNames.length;
  return `${previewNames.join(", ")}${hiddenCount > 0 ? `, +${hiddenCount}` : ""}`;
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

function createSellerBusinessStyles(t: Theme, topContentInset = 0) {
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
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
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
    sectionTitle: {
      paddingLeft: t.spacing.md,
    },
    surface: {
      minHeight: 64,
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      justifyContent: "center",
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    chip: {
      maxWidth: "100%",
      minHeight: 32,
      borderRadius: 999,
      ...t.glass.chip,
      paddingHorizontal: t.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    chipText: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    reviewsSurface: {
      ...createRoundedSurfaceStyle(t),
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    reviewRow: {
      paddingVertical: t.spacing.sm,
      gap: t.spacing.sm,
    },
    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    reviewDate: {
      flexShrink: 1,
      textAlign: "right",
    },
    reviewTags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(0,0,0,0.08)",
    },
  });
}
