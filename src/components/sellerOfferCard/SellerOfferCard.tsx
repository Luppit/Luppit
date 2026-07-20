import { Icon } from "@/src/components/Icon";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import StatusChip from "@/src/components/statusChip/StatusChip";
import { Text } from "@/src/components/Text";
import { SellerPurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { Theme, useTheme } from "@/src/themes";
import React from "react";
import { StyleSheet, View } from "react-native";

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

  return `Enviada el ${date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
  })}`;
}

function formatAccessibleOfferDate(rawDate: string | null | undefined) {
  if (!rawDate) return null;
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SellerOfferCard({
  offer,
  onPress,
  onLongPress,
}: SellerOfferCardProps) {
  const t = useTheme();
  const s = React.useMemo(() => createSellerOfferCardStyles(t), [t]);

  const requestTitle = offer.request_title?.trim() || offer.description?.trim() || "";
  const categoryName = offer.request_category_name?.trim();
  const profileName = offer.request_profile_name?.trim();
  const offerDate = formatOfferDate(offer.created_at);
  const accessibleOfferDate = formatAccessibleOfferDate(offer.created_at);
  const statusLabel = offer.conversation_status_label?.trim();
  const buyerLabel = profileName ? `Comprador · ${profileName}` : "Comprador";
  const currencyCode = offer.offer_currency_code ?? "CRC";
  const pricePrefix = normalize(currencyCode) === "usd" ? "$" : "₡";
  const formattedPrice = `${pricePrefix}${Number(offer.price ?? 0).toLocaleString("es-CR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
  const accessibilityLabel = [
    categoryName,
    requestTitle || "Solicitud",
    `Estado: ${statusLabel || "no disponible"}`,
    buyerLabel,
    `Tu oferta: ${formattedPrice}`,
    accessibleOfferDate ? `Enviada el ${accessibleOfferDate}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <MarketplaceCardFrame
      title={requestTitle || "Solicitud"}
      headerMeta={
        categoryName ? (
          <Text variant="small" color="textMedium">
            {categoryName}
          </Text>
        ) : null
      }
      glassSurface
      fullText
      prominentTitle
      footerDivider
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={
        onLongPress
          ? "Toca dos veces para abrir la conversación. Mantén presionado para ver opciones."
          : "Toca dos veces para abrir la conversación."
      }
      body={
        <View style={s.body}>
          {statusLabel ? (
            <StatusChip
              label={statusLabel}
              styleCode={offer.conversation_status_style_code}
              allowWrap
            />
          ) : (
            <Text variant="small" color="stateAnulated">
              Estado no disponible
            </Text>
          )}

          <View style={s.priceBlock}>
            <Text variant="small" color="textMedium">
              Tu oferta
            </Text>
            <Text variant="subtitle" style={s.price}>
              {formattedPrice}
            </Text>
          </View>

          <Text variant="body" color="textMedium">
            {buyerLabel}
          </Text>
        </View>
      }
      footerLeft={
        offerDate ? (
          <Text variant="small" color="textMedium">
            {offerDate}
          </Text>
        ) : null
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

function createSellerOfferCardStyles(t: Theme) {
  return StyleSheet.create({
    body: {
      gap: t.spacing.md,
    },
    priceBlock: {
      gap: t.spacing.xs,
    },
    price: {
      color: t.colors.primary,
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
