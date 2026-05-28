import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type SellerOfferCardStyles = {
  wrapper: ViewStyle;
  surface: ViewStyle;
  card: ViewStyle;
  titleRow: ViewStyle;
  title: TextStyle;
  description: TextStyle;
  descriptionSpacer: ViewStyle;
  detailRow: ViewStyle;
  metaText: TextStyle;
  statusPill: ViewStyle;
  statusDot: ViewStyle;
  statusText: TextStyle;
  priceText: TextStyle;
};

export function createSellerOfferCardStyles(t: Theme): SellerOfferCardStyles {
  return {
    wrapper: {
      width: "100%",
      alignSelf: "stretch",
      borderRadius: 24,
    },
    surface: {
      borderRadius: 24,
    },
    card: {
      minHeight: 116,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 8,
      overflow: "hidden",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 2,
    },
    title: {
      color: t.colors.textDark,
      flex: 1,
      paddingRight: t.spacing.sm,
    },
    metaText: {
      color: t.colors.textMedium,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    description: {
      color: t.colors.stateAnulated,
      flex: 1,
    },
    descriptionSpacer: {
      flex: 1,
    },
    statusPill: {
      ...t.glass.chip,
      backgroundColor: t.colors.primaryLight,
      borderRadius: 999,
      maxWidth: "55%",
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: t.colors.primary,
    },
    statusText: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    priceText: {
      color: t.colors.textDark,
      flexShrink: 0,
    },
  };
}
