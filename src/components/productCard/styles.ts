import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type ProductCardStyles = {
  wrapper: ViewStyle;
  card: ViewStyle;
  topSheen: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  bottomRow: ViewStyle;
  viewsRow: ViewStyle;
  viewsText: TextStyle;
  offersMetric: ViewStyle;
  offersText: TextStyle;
  offersTextActive: TextStyle;
  offersTextInactive: TextStyle;
  offersPlainText: TextStyle;
};

export function createProductCardStyles(t: Theme): ProductCardStyles {
  return {
    wrapper: {
      width: "100%",
      alignSelf: "stretch",
      borderRadius: 24,
      ...t.glass.surface,
    },
    card: {
      minHeight: 144,
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: "transparent",
      overflow: "hidden",
      gap: 8,
    },
    topSheen: {
      ...t.glass.topHighlight,
    },
    title: {
      color: t.colors.textDark,
    },
    subtitle: {
      color: t.colors.textMedium,
    },
    bottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 24,
      gap: t.spacing.sm,
    },
    viewsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
      flexShrink: 0,
    },
    viewsText: {
      color: t.colors.stateAnulated,
    },
    offersMetric: {
      maxWidth: "72%",
      minHeight: 24,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 5,
      flexShrink: 1,
    },
    offersText: {
      flexShrink: 1,
    },
    offersTextActive: {
      color: t.colors.textDark,
      fontFamily: t.typography.label.fontFamily,
    },
    offersTextInactive: {
      color: t.colors.textDark,
    },
    offersPlainText: {
      color: t.colors.textMedium,
      flex: 1,
      textAlign: "right",
    },
  };
}
