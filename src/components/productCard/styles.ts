import {
  createRoundedSurfaceStyle,
  ROUNDED_SURFACE_RADIUS,
} from "@/src/components/surface/styles";
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
      ...createRoundedSurfaceStyle(t),
    },
    card: {
      minHeight: 144,
      borderRadius: ROUNDED_SURFACE_RADIUS,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      backgroundColor: "transparent",
      overflow: "hidden",
      gap: 8,
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
