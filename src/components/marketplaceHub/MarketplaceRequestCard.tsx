import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { View } from "react-native";
import MarketplaceCardFrame from "./MarketplaceCardFrame";

export type MarketplaceRequestCardItem = {
  id: string;
  title: string | null;
  category_name: string | null;
  created_at: string;
  published_at: string | null;
  offers_count?: number | null;
  event_at?: string | null;
  reason?: { label?: string | null } | null;
};

type MarketplaceRequestCardProps = {
  item: MarketplaceRequestCardItem;
  compact?: boolean;
  contextLabel?: string | null;
  metricLabel?: string | null;
  onPress: () => void;
  onLongPress?: () => void;
};

function formatActivityLabel(rawDate: string | null): string {
  if (!rawDate) return "Ahora";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "Ahora";

  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes <= 1) return "Ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} d`;
  return date.toLocaleDateString("es-CR");
}

function getMetricLabel(item: MarketplaceRequestCardItem) {
  const offersCount = typeof item.offers_count === "number" ? item.offers_count : 0;
  if (offersCount > 0) {
    return `${offersCount} ${offersCount === 1 ? "oferta" : "ofertas"}`;
  }

  return formatActivityLabel(item.event_at ?? item.published_at ?? item.created_at);
}

export default function MarketplaceRequestCard({
  item,
  compact = false,
  contextLabel,
  metricLabel,
  onPress,
  onLongPress,
}: MarketplaceRequestCardProps) {
  const t = useTheme();
  const reasonLabel = contextLabel?.trim() || item.reason?.label?.trim();

  return (
    <MarketplaceCardFrame
      title={item.title ?? "Solicitud"}
      subtitle={item.category_name}
      compact={compact}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`Abrir ${item.title ?? "solicitud"}`}
      body={
        reasonLabel ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.xs }}>
            <Icon name="sparkles" size={16} color={t.colors.primary} />
            <Text variant="body" maxLines={compact ? 1 : 2} style={{ flex: 1 }}>
              {reasonLabel}
            </Text>
          </View>
        ) : null
      }
      footerLeft={
        <View>
          <Text variant="body" color="stateAnulated" maxLines={1}>
            {metricLabel?.trim() || getMetricLabel(item)}
          </Text>
        </View>
      }
      footerRight={<Icon name="arrow-right" size={18} color={t.colors.textMedium} />}
    />
  );
}
