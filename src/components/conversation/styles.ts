import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type ConversationActionButtonsStyles = {
  container: ViewStyle;
  summaryContainer: ViewStyle;
  summaryContainerStacked: ViewStyle;
  summaryLabel: TextStyle;
  summaryValue: TextStyle;
  actions: ViewStyle;
  actionsStacked: ViewStyle;
  button: ViewStyle;
  buttonFull: ViewStyle;
  buttonEqual: ViewStyle;
  buttonPrimary: ViewStyle;
  buttonSecondary: ViewStyle;
  buttonDanger: ViewStyle;
  buttonPressed: ViewStyle;
  buttonDisabled: ViewStyle;
  label: TextStyle;
  labelPrimary: TextStyle;
  labelDanger: TextStyle;
};

export function createConversationActionButtonsStyles(
  t: Theme
): ConversationActionButtonsStyles {
  return {
    container: {
      alignSelf: "stretch",
      gap: t.spacing.sm + t.spacing.xs,
    },
    summaryContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.md,
      minHeight: 32,
      paddingHorizontal: t.spacing.xs,
    },
    summaryContainerStacked: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: t.spacing.xs,
    },
    summaryLabel: {
      flexShrink: 1,
      fontFamily: t.typography.subtitle.fontFamily,
    },
    summaryValue: {
      color: t.colors.textDark,
      flexShrink: 0,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "stretch",
      gap: t.spacing.sm,
    },
    actionsStacked: {
      flexDirection: "column",
    },
    button: {
      minHeight: 48,
      minWidth: 44,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      borderRadius: t.borders.md,
      borderCurve: "continuous",
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    buttonFull: {
      alignSelf: "stretch",
      width: "100%",
    },
    buttonEqual: {
      flexBasis: 0,
      flexGrow: 1,
    },
    buttonPrimary: {
      backgroundColor: t.colors.textDark,
      borderColor: t.colors.textDark,
    },
    buttonSecondary: {
      backgroundColor: t.colors.backgroudWhite,
      borderColor: t.colors.border,
    },
    buttonDanger: {
      backgroundColor: t.colors.backgroudWhite,
      borderColor: t.colors.error,
    },
    buttonPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.99 }],
    },
    buttonDisabled: {
      opacity: 0.55,
    },
    label: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    labelPrimary: {
      color: t.colors.backgroudWhite,
    },
    labelDanger: {
      color: t.colors.error,
    },
  };
}
