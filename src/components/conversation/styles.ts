import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type ConversationActionButtonsStyles = {
  shadowWrapper: ViewStyle;
  container: ViewStyle;
  button: ViewStyle;
  divider: ViewStyle;
  label: TextStyle;
};

export function createConversationActionButtonsStyles(
  t: Theme
): ConversationActionButtonsStyles {
  return {
    shadowWrapper: {
      marginTop: t.spacing.md,
      alignSelf: "center",
      borderRadius: 22,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 10,
      elevation: 10,
      backgroundColor: t.colors.backgroudWhite,
    },
    container: {
      flexDirection: "row",
      overflow: "hidden",
      borderRadius: 22,
      backgroundColor: t.colors.backgroudWhite,
    },
    button: {
      minHeight: 52,
      paddingHorizontal: t.spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.xs,
    },
    divider: {
      borderLeftWidth: 1,
      borderLeftColor: t.colors.border,
    },
    label: {
      lineHeight: 22,
    },
  };
}
