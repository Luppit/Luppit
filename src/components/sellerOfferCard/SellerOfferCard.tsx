import { Icon } from "@/src/components/Icon";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import { Text } from "@/src/components/Text";
import { SellerPurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { useTheme } from "@/src/themes";
import React from "react";
import { View } from "react-native";

type SellerOfferCardProps = {
  offer: SellerPurchaseOfferCardData;
  onPress?: () => void;
  onLongPress?: () => void;
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
  onPress,
  onLongPress,
}: SellerOfferCardProps) {
  const t = useTheme();

  const requestTitle = offer.request_title?.trim() || offer.description?.trim() || "";
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

  return (
    <MarketplaceCardFrame
      title={requestTitle || "Solicitud"}
      subtitle={categoryName}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`Abrir oferta para ${requestTitle || "solicitud"}`}
      body={
        <View style={{ gap: t.spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.xs }}>
            <Icon name="user" size={16} color={t.colors.primary} />
            <Text variant="body" maxLines={1} style={{ flex: 1 }}>
              Comprador:{" "}
              <Text variant="label" style={{ color: t.colors.textDark }}>
                {profileName || "Sin nombre"}
              </Text>
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.xs }}>
            <Icon name="tag" size={16} color={t.colors.primary} />
            <Text variant="body" maxLines={1} style={{ flex: 1 }}>
              Tu oferta:{" "}
              <Text variant="label" style={{ color: t.colors.textDark }}>
                {formattedPrice}
              </Text>
            </Text>
          </View>
        </View>
      }
      footerLeft={
        offerDate ? (
          <Text variant="body" color="stateAnulated" maxLines={1}>
            {offerDate}
          </Text>
        ) : null
      }
      footerRight={<Icon name="arrow-right" size={18} color={t.colors.textMedium} />}
    />
  );
}
