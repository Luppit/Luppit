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

export default function SellerOfferCard({
  offer,
  statusLabel = "Activa",
  onPress,
}: SellerOfferCardProps) {
  const t = useTheme();
  const s = useMemo(() => createSellerOfferCardStyles(t), [t]);

  const description = offer.description?.trim() || "-";
  const categoryName = offer.request_category_name?.trim() || "-";
  const profileName = offer.request_profile_name?.trim() || "-";
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
    <Pressable
      style={s.wrapper}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
    >
      <View style={s.card}>
        <View style={s.topSection}>
          <Text variant="subtitleRegular" maxLines={1} style={s.description}>
            {description}
          </Text>
          <Text variant="body" maxLines={1} style={s.category}>
            {categoryName}
          </Text>
        </View>

        <View style={s.bottomRow}>
          <Text variant="subtitleRegular" maxLines={1} style={s.profileName}>
            {profileName}
          </Text>
          <View style={s.statusPill}>
            <Text variant="body" style={s.statusText}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <Text variant="body" style={s.priceText}>
        {formattedPrice}
      </Text>
    </Pressable>
  );
}
