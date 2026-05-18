import GlassSurface from "@/src/components/glass/GlassSurface";
import { Text } from "@/src/components/Text";
import { SellerPurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { createSellerOfferCardStyles } from "./styles";

type SellerOfferCardProps = {
  offer: SellerPurchaseOfferCardData;
  statusLabel?: string;
  onPress?: () => void;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatOfferDate(rawDate: string | null | undefined) {
  if (!rawDate) return null;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
  });
}

export default function SellerOfferCard({
  offer,
  statusLabel,
  onPress,
}: SellerOfferCardProps) {
  const t = useTheme();
  const s = useMemo(() => createSellerOfferCardStyles(t), [t]);

  const requestTitle = offer.request_title?.trim() || "Solicitud";
  const description = offer.description?.trim();
  const categoryName = offer.request_category_name?.trim();
  const profileName = offer.request_profile_name?.trim();
  const offerDate = formatOfferDate(offer.created_at);
  const currencyCode = offer.offer_currency_code ?? "CRC";
  const pricePrefix = normalize(currencyCode) === "usd" ? "$" : "₡";
  const formattedPrice = `${pricePrefix}${Number(offer.price ?? 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
  const resolvedStatusLabel = statusLabel?.trim();
  const metaItems = [
    profileName ? `Para ${profileName}` : null,
    categoryName,
    offerDate,
  ].filter((item): item is string => Boolean(item));
  const showDescription =
    Boolean(description) && normalize(description) !== normalize(requestTitle);

  return (
    <Pressable
      style={s.wrapper}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
    >
      <GlassSurface
        variant="surface"
        highlight
        style={s.surface}
        contentStyle={s.card}
      >
        <View>
          <View style={s.titleRow}>
            <Text variant="subtitleRegular" maxLines={1} style={s.title}>
              {requestTitle}
            </Text>
            <Text variant="subtitleRegular" maxLines={1} style={s.priceText}>
              {formattedPrice}
            </Text>
          </View>

          {metaItems.length > 0 ? (
            <Text variant="body" maxLines={1} style={s.metaText}>
              {metaItems.join(" · ")}
            </Text>
          ) : null}
        </View>

        <View style={s.detailRow}>
          {showDescription ? (
            <Text variant="body" maxLines={2} style={s.description}>
              {description}
            </Text>
          ) : (
            <View style={s.descriptionSpacer} />
          )}
          {resolvedStatusLabel ? (
            <View style={s.statusPill}>
              <View style={s.statusDot} />
              <Text variant="body" maxLines={1} style={s.statusText}>
                {resolvedStatusLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </GlassSurface>
    </Pressable>
  );
}
