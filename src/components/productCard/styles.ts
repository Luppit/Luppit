import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type ProductCardStyles = {
  wrapper: ViewStyle;
  card: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  bottomRow: ViewStyle;
  viewsRow: ViewStyle;
  viewsText: TextStyle;
  statusPill: ViewStyle;
  statusText: TextStyle;
  offersText: TextStyle;
};

export function createProductCardStyles(t: Theme): ProductCardStyles {
  return {
    wrapper: {
      width: "100%",
      alignSelf: "stretch",
      borderRadius: 22,
      backgroundColor: t.colors.primaryLight,
      padding: 8,
      gap: t.spacing.xs,
    },
    card: {
      backgroundColor: t.colors.backgroudWhite,
      borderRadius: 18,
      paddingHorizontal: t.spacing.md,
      paddingTop: t.spacing.sm + t.spacing.xs,
      paddingBottom: t.spacing.xs + t.spacing.xs,
      gap: t.spacing.md,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 4,
    },
    title: {
      color: t.colors.textDark,
    },
    subtitle: {
      color: t.colors.stateAnulated,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    viewsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    viewsText: {
      color: t.colors.stateAnulated,
    },
    statusPill: {
      backgroundColor: t.colors.primary,
      borderRadius: 999,
      paddingHorizontal: t.spacing.md,
      paddingVertical: 6,
      minWidth: 120,
      alignItems: "center",
    },
    statusText: {
      color: t.colors.backgroudWhite,
    },
    offersText: {
      color: t.colors.textDark,
      textAlign: "center",
    },
  };
}
