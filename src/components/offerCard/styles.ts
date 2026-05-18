import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type OfferCardStyles = {
  surface: ViewStyle;
  container: ViewStyle;
  topRow: ViewStyle;
  businessBlock: ViewStyle;
  priceBlock: ViewStyle;
  businessName: TextStyle;
  province: TextStyle;
  metaRow: ViewStyle;
  ratingRow: ViewStyle;
  ratingText: TextStyle;
  priceText: TextStyle;
  badge: ViewStyle;
  badgeDot: ViewStyle;
  badgeText: TextStyle;
  separator: ViewStyle;
  timelineContainer: ViewStyle;
  timelineRow: ViewStyle;
  timelineIconColumn: ViewStyle;
  timelineIconCircle: ViewStyle;
  timelineIconCirclePending: ViewStyle;
  timelineConnector: ViewStyle;
  timelineTextContainer: ViewStyle;
  timelineDateText: TextStyle;
  timelineLabelText: TextStyle;
  actionsRow: ViewStyle;
  menuButton: ViewStyle;
  connectButton: ViewStyle;
  connectText: TextStyle;
};

export function createOfferCardStyles(t: Theme): OfferCardStyles {
  return {
    surface: {
      borderRadius: 24,
    },
    container: {
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
      overflow: "hidden",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    businessBlock: {
      flex: 1,
      minWidth: 0,
    },
    priceBlock: {
      alignItems: "flex-end",
      flexShrink: 0,
    },
    businessName: {
      color: t.colors.textDark,
    },
    province: {
      color: t.colors.textMedium,
    },
    metaRow: {
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
      flexShrink: 1,
    },
    ratingText: {
      color: t.colors.textDark,
    },
    priceText: {
      color: t.colors.primary,
      textAlign: "right",
    },
    badge: {
      ...t.glass.chip,
      alignSelf: "flex-end",
      maxWidth: "58%",
      borderRadius: 999,
      backgroundColor: t.colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
    },
    badgeDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: t.colors.primary,
      flexShrink: 0,
    },
    badgeText: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    separator: {
      height: 1,
      backgroundColor: t.colors.border,
      opacity: 0.75,
    },
    timelineContainer: {
      gap: t.spacing.md,
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: t.spacing.sm,
    },
    timelineIconColumn: {
      width: 24,
      position: "relative",
      alignItems: "center",
    },
    timelineIconCircle: {
      width: 24,
      height: 24,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    timelineIconCirclePending: {
      backgroundColor: t.colors.stateAnulated,
    },
    timelineConnector: {
      position: "absolute",
      left: 11,
      top: 32,
      width: 2,
      borderRadius: 99,
    },
    timelineTextContainer: {
      flex: 1,
      paddingBottom: t.spacing.sm,
    },
    timelineDateText: {
      marginBottom: 2,
    },
    timelineLabelText: {
      color: t.colors.textDark,
    },
    actionsRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
      alignItems: "center",
    },
    menuButton: {
      width: 52,
      height: 48,
      borderRadius: 16,
      backgroundColor: t.colors.textDark,
      alignItems: "center",
      justifyContent: "center",
    },
    connectButton: {
      flex: 1,
      height: 48,
      borderRadius: 16,
      backgroundColor: t.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    connectText: {
      color: t.colors.backgroudWhite,
    },
  };
}
