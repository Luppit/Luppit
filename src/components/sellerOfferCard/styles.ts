import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type SellerOfferCardStyles = {
  wrapper: ViewStyle;
  card: ViewStyle;
  topSection: ViewStyle;
  description: TextStyle;
  category: TextStyle;
  bottomRow: ViewStyle;
  profileName: TextStyle;
  statusPill: ViewStyle;
  statusText: TextStyle;
  priceText: TextStyle;
};

export function createSellerOfferCardStyles(t: Theme): SellerOfferCardStyles {
  return {
    wrapper: {
      width: "100%",
      alignSelf: "stretch",
      borderRadius: 22,
      backgroundColor: t.colors.primaryLight,
      padding: t.spacing.sm,
      gap: t.spacing.xs,
    },
    card: {
      backgroundColor: t.colors.backgroudWhite,
      borderRadius: 18,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      gap: t.spacing.md,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 4,
    },
    topSection: {
      gap: 2,
    },
    description: {
      color: t.colors.textDark,
    },
    category: {
      color: t.colors.stateAnulated,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    profileName: {
      color: t.colors.textDark,
      flex: 1,
    },
    statusPill: {
      backgroundColor: t.colors.primary,
      borderRadius: 999,
      paddingHorizontal: t.spacing.md,
      paddingVertical: 6,
    },
    statusText: {
      color: t.colors.backgroudWhite,
    },
    priceText: {
      color: t.colors.textDark,
      textAlign: "center",
    },
  };
}
