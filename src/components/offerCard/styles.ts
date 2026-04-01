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
    separator: {
      height: 1,
      backgroundColor: t.colors.border,
      marginTop: 0,
      marginBottom: t.spacing.md,
    },
    timelineContainer: {
      gap: t.spacing.md,
      marginBottom: t.spacing.md,
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
