import { Icon } from "@/src/components/Icon";
import StatusChip from "@/src/components/statusChip/StatusChip";
import { Text } from "@/src/components/Text";
import { Theme, useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import MarketplaceCardFrame from "./MarketplaceCardFrame";

export type MarketplaceRequestCardItem = {
  id: string;
  title: string | null;
  category_name: string | null;
  created_at: string;
  published_at: string | null;
  offers_count?: number | null;
  status_label?: string | null;
  status_style_code?: string | null;
  views_count?: number | null;
  event_at?: string | null;
  seller_interaction_state?: string | null;
  reason?: { code?: string | null; label?: string | null } | null;
};

type MarketplaceRequestCardProps = {
  item: MarketplaceRequestCardItem;
  role: "buyer" | "seller";
  compact?: boolean;
  contextLabel?: string | null;
  metricLabel?: string | null;
  showSellerActivity?: boolean;
  showSellerStatus?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
};

function formatActivityLabel(rawDate: string | null): string | null {
  if (!rawDate) return null;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes <= 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} d`;
  return date.toLocaleDateString("es-CR");
}

function getBuyerOfferLabel(item: MarketplaceRequestCardItem) {
  const offersCount = typeof item.offers_count === "number" ? item.offers_count : 0;
  if (offersCount === 0) return "Sin ofertas";
  return `${offersCount} ${offersCount === 1 ? "oferta" : "ofertas"}`;
}

function getBuyerViewsLabel(item: MarketplaceRequestCardItem) {
  const viewsCount = typeof item.views_count === "number" ? item.views_count : 0;
  return `${viewsCount} ${viewsCount === 1 ? "vista" : "vistas"}`;
}

function isSellerCompetitionReason(item: MarketplaceRequestCardItem) {
  return (
    item.reason?.code?.trim() === "seller_low_competition" ||
    item.reason?.label?.trim().toLocaleLowerCase() === "poca competencia"
  );
}

function getSellerContextLabel(
  item: MarketplaceRequestCardItem,
  contextLabel: string | null | undefined,
  includeStatusFallback = true
) {
  const explicitContextLabel = contextLabel?.trim();
  if (explicitContextLabel) return explicitContextLabel;

  const reason = isSellerCompetitionReason(item) ? undefined : item.reason?.label?.trim();
  return reason || (includeStatusFallback ? item.status_label?.trim() : undefined);
}

function getSellerMetricLabel(item: MarketplaceRequestCardItem) {
  const isNewOpportunity =
    item.seller_interaction_state?.trim().toLowerCase() === "new";
  const eventAt = item.event_at?.trim() || null;
  const isPublicationActivity = isNewOpportunity || !eventAt;
  const activity = formatActivityLabel(
    isPublicationActivity
      ? item.published_at ?? item.created_at
      : eventAt
  );

  if (!activity) {
    return isPublicationActivity ? "Publicada recientemente" : "Actividad reciente";
  }

  const naturalActivity =
    activity === "Ahora"
      ? "ahora"
      : activity.startsWith("Hace ")
        ? `hace ${activity.slice(5)}`
        : `el ${activity}`;

  return `${isPublicationActivity ? "Publicada" : "Actividad"} ${naturalActivity}`;
}

export default function MarketplaceRequestCard({
  item,
  role,
  compact = false,
  contextLabel,
  metricLabel,
  showSellerActivity = false,
  showSellerStatus = false,
  onPress,
  onLongPress,
}: MarketplaceRequestCardProps) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceRequestCardStyles(t), [t]);
  const titleLabel = item.title?.trim() || "Solicitud";
  const categoryLabel = item.category_name?.trim();
  const statusLabel =
    role === "buyer" || (role === "seller" && showSellerStatus)
      ? item.status_label?.trim()
      : undefined;
  const displayedContext =
    role === "seller"
      ? getSellerContextLabel(item, contextLabel, !showSellerStatus)
      : contextLabel?.trim() || item.reason?.label?.trim();
  const sellerActivityLabel =
    role === "seller" && showSellerActivity ? getSellerMetricLabel(item) : undefined;
  const explicitMetricLabel = metricLabel?.trim();
  const footerLabels = explicitMetricLabel
    ? [explicitMetricLabel]
    : role === "seller"
      ? [getSellerMetricLabel(item)]
      : [getBuyerOfferLabel(item), getBuyerViewsLabel(item)];
  const accessibilityLabel = [
    categoryLabel,
    titleLabel,
    statusLabel,
    displayedContext,
    sellerActivityLabel,
    ...footerLabels,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <MarketplaceCardFrame
      title={titleLabel}
      headerMeta={
        categoryLabel ? (
          <Text variant="small" color="textMedium">
            {categoryLabel}
          </Text>
        ) : null
      }
      compact={compact}
      glassSurface
      fullText
      prominentTitle
      footerDivider
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        onLongPress
          ? "Toca dos veces para abrir la solicitud. Mantén presionado para ver opciones."
          : "Toca dos veces para abrir la solicitud."
      }
      body={
        statusLabel || displayedContext || sellerActivityLabel ? (
          <View style={s.contextStack}>
            {statusLabel ? (
              <StatusChip
                label={statusLabel}
                styleCode={item.status_style_code}
                allowWrap
              />
            ) : null}
            {displayedContext ? (
              <Text variant="body" color="textMedium">
                {displayedContext}
              </Text>
            ) : null}
            {sellerActivityLabel ? (
              <Text variant="small" color="textMedium">
                {sellerActivityLabel}
              </Text>
            ) : null}
          </View>
        ) : null
      }
      footerLeft={
        explicitMetricLabel || role === "seller" ? (
          <Text variant="small" color="textMedium">
            {footerLabels[0]}
          </Text>
        ) : (
          <View style={s.metricGroup}>
            <View style={s.metricItem}>
              <Icon name="handshake" size={15} color={t.colors.textMedium} />
              <Text variant="small" color="textMedium">
                {footerLabels[0]}
              </Text>
            </View>
            <View style={s.metricItem}>
              <Icon name="eye" size={15} color={t.colors.textMedium} />
              <Text variant="small" color="textMedium">
                {footerLabels[1]}
              </Text>
            </View>
          </View>
        )
      }
      footerRight={
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={s.arrowButton}
        >
          <Icon name="arrow-right" size={20} color={t.colors.textMedium} />
        </View>
      }
    />
  );
}

function createMarketplaceRequestCardStyles(t: Theme) {
  return StyleSheet.create({
    contextStack: {
      gap: t.spacing.sm,
    },
    metricGroup: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: t.spacing.md,
    },
    metricItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    arrowButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
    },
  });
}
