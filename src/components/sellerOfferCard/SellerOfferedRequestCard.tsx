import { Icon } from "@/src/components/Icon";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import { Text } from "@/src/components/Text";
import type { SellerPurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { Theme, useTheme } from "@/src/themes";
import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  offer: SellerPurchaseOfferCardData;
  offerCount: number;
  onPress: () => void;
  onLongPress?: () => void;
};

export default function SellerOfferedRequestCard({ offer, offerCount, onPress, onLongPress }: Props) {
  const t = useTheme();
  const s = React.useMemo(() => createSellerOfferedRequestCardStyles(t), [t]);
  const title = offer.request_title?.trim() || "Solicitud";
  const countLabel = offerCount === 1 ? "1 oferta" : `${offerCount} ofertas`;
  const buyerName = offer.request_profile_name?.trim();

  return (
    <MarketplaceCardFrame
      title={title}
      headerMeta={
        <View style={s.headerMeta}>
          <Text variant="small" color="textMedium" style={s.category}>
            {offer.request_category_name?.trim()}
          </Text>
          <View style={s.countBadge}>
            <Text variant="small" style={s.countText}>{countLabel}</Text>
          </View>
        </View>
      }
      glassSurface
      prominentTitle
      fullText
      footerDivider
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={[title, countLabel, buyerName ? `Comprador: ${buyerName}` : null, "Ver ofertas"].filter(Boolean).join(". ")}
      accessibilityHint="Abre el detalle de la solicitud y tus conversaciones de oferta."
      body={buyerName ? <Text variant="body" color="textMedium">Comprador · {buyerName}</Text> : null}
      footerLeft={<Text variant="body">Ver ofertas</Text>}
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

function createSellerOfferedRequestCardStyles(t: Theme) {
  return StyleSheet.create({
    headerMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    category: {
      flexShrink: 1,
    },
    countBadge: {
      backgroundColor: t.colors.primaryLight,
      borderRadius: 999,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.xs,
    },
    countText: {
      fontFamily: t.typography.subtitle.fontFamily,
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
