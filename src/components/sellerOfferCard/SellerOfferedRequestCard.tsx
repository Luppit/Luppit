import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import { Text } from "@/src/components/Text";
import type { SellerPurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import React from "react";
import { View } from "react-native";

type Props = {
  offer: SellerPurchaseOfferCardData;
  offerCount: number;
  onPress: () => void;
  onLongPress?: () => void;
};

export default function SellerOfferedRequestCard({ offer, offerCount, onPress, onLongPress }: Props) {
  const title = offer.request_title?.trim() || "Solicitud";
  const countLabel = offerCount === 1 ? "1 oferta" : `${offerCount} ofertas`;

  return (
    <MarketplaceCardFrame
      title={title}
      headerMeta={offer.request_category_name ? (
        <Text variant="small" color="textMedium">{offer.request_category_name}</Text>
      ) : null}
      glassSurface
      prominentTitle
      fullText
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${title}. ${countLabel}. Ver solicitud y ofertas.`}
      accessibilityHint="Abre el detalle de la solicitud y tus conversaciones de oferta."
      body={
        <View>
          <Text variant="body">{countLabel}</Text>
          {offer.conversation_status_label ? (
            <Text variant="small" color="textMedium">
              Oferta reciente · {offer.conversation_status_label}
            </Text>
          ) : null}
          {offer.request_profile_name ? (
            <Text variant="small" color="textMedium">
              Comprador · {offer.request_profile_name}
            </Text>
          ) : null}
        </View>
      }
      footerRight={<Text variant="small" color="textMedium">Ver ofertas →</Text>}
    />
  );
}
