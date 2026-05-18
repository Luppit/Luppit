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
  statusPill: ViewStyle;
  statusDot: ViewStyle;
  statusText: TextStyle;
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
    statusPill: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      minHeight: 32,
      backgroundColor: t.colors.primaryLight,
      borderWidth: 1,
      borderColor: "rgba(131,163,30,0.18)",
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: t.colors.primary,
      flexShrink: 0,
    },
    statusText: {
      color: t.colors.textDark,
      flexShrink: 1,
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
