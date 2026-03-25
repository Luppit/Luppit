import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { openPopup } from "@/src/services/popup.service";
import { PurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { createOfferCardStyles } from "./styles";

type OfferCardProps = {
  offer: PurchaseOfferCardData;
  onConnect?: () => void;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function OfferCard({ offer, onConnect }: OfferCardProps) {
  const t = useTheme();
  const s = useMemo(() => createOfferCardStyles(t), [t]);
  const businessName = offer.business_name ?? "-";
  const province = offer.business_province ?? "-";
  const rating = offer.business_rating ?? 0;
  const numRatings = offer.business_num_ratings ?? 0;
  const currencyCode = offer.offer_currency_code ?? "CRC";
  const pricePrefix = normalize(currencyCode) === "usd" ? "$" : "₡";
  const formattedPrice = `${pricePrefix}${Number(offer.price ?? 0).toLocaleString("en-US")}`;
  const badgeText = rating >= 4.7 ? "Mejor reputación" : "Mejor oferta";
  const badgeColor = rating >= 4.7 ? t.colors.info : t.colors.primaryLight;

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <View style={{ flex: 1 }}>
          <Text variant="titleRegular" maxLines={1} style={s.businessName}>
            {businessName}
          </Text>
          <Text variant="body" style={s.province}>
            {province}
          </Text>
          <View style={s.ratingRow}>
            <Icon name="star" size={18} color={t.colors.accentYellow} />
            <Text variant="body" style={s.ratingText}>
              {rating.toFixed(1)}
            </Text>
            <Text variant="body" color="stateAnulated">
              ({numRatings})
            </Text>
          </View>
        </View>

        <View style={{ alignItems: "flex-end", gap: t.spacing.sm }}>
          <Text variant="price" style={s.priceText}>
            {formattedPrice}
          </Text>
          <View style={[s.badge, { backgroundColor: badgeColor }]}>
            <Text variant="body" style={s.badgeText}>
              {badgeText}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.actionsRow}>
        <Pressable
          style={s.menuButton}
          onPress={() =>
            openPopup({
              options: [
                {
                  id: "favorite",
                  label: "Añadir como favorito",
                  icon: "heart",
                  textColorKey: "textDark",
                  iconColorKey: "textDark",
                },
                {
                  id: "reject",
                  label: "Rechazar oferta",
                  icon: "trash-2",
                  textColorKey: "error",
                  iconColorKey: "error",
                },
              ],
            })
          }
        >
          <Icon name="ellipsis" size={24} color={t.colors.backgroudWhite} />
        </Pressable>

        <Pressable style={s.connectButton} onPress={onConnect}>
          <Text variant="body" style={s.connectText}>
            Conectar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
