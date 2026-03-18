import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type OfferCardStyles = {
  container: ViewStyle;
  topRow: ViewStyle;
  businessName: TextStyle;
  province: TextStyle;
  ratingRow: ViewStyle;
  ratingText: TextStyle;
  priceText: TextStyle;
  badge: ViewStyle;
  badgeText: TextStyle;
  actionsRow: ViewStyle;
  menuButton: ViewStyle;
  connectButton: ViewStyle;
  connectText: TextStyle;
};

export function createOfferCardStyles(t: Theme): OfferCardStyles {
  return {
    container: {
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.md,
      padding: t.spacing.md,
      backgroundColor: t.colors.backgroudWhite,
      gap: t.spacing.sm,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: t.spacing.md,
      marginBottom: t.spacing.md
    },
    businessName: {
      color: t.colors.textDark,
    },
    province: {
      color: t.colors.textDark,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    ratingText: {
      color: t.colors.textDark,
    },
    priceText: {
      color: t.colors.primary,
      textAlign: "right",
    },
    badge: {
      alignSelf: "flex-end",
      borderRadius: 999,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.xs,
      backgroundColor: t.colors.primaryLight,
    },
    badgeText: {
      color: t.colors.textDark,
    },
    actionsRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
    },
    menuButton: {
      width: 64,
      height: 64,
      borderRadius: t.borders.md,
      backgroundColor: t.colors.textDark,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
    },
    connectButton: {
      flex: 1,
      height: 64,
      borderRadius: t.borders.md,
      backgroundColor: t.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    connectText: {
      color: t.colors.backgroudWhite,
    },
  };
}
