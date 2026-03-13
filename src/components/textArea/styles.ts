import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type TextAreaStyles = {
  baseContainer: ViewStyle;
  label: TextStyle;
  inputContainer: ViewStyle;
  inputContainerFocused: ViewStyle;
  inputContainerError: ViewStyle;
  inputContainerDisabled: ViewStyle;
  input: TextStyle;
  errorLabel: TextStyle;
};

export function createTextAreaStyles(t: Theme): TextAreaStyles {
  return {
    baseContainer: {
      marginBottom: t.spacing.lg,
    },
    label: {
      paddingLeft: t.spacing.sm,
      marginBottom: t.spacing.xs,
    },
    inputContainer: {
      borderWidth: 1,
      borderRadius: t.borders.sm,
      borderColor: t.colors.border,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      minHeight: 118,
      backgroundColor: t.colors.backgroudWhite,
    },
    inputContainerFocused: {
      borderWidth: 2,
    },
    inputContainerError: {
      borderColor: t.colors.error,
    },
    inputContainerDisabled: {
      backgroundColor: t.colors.background,
      opacity: 0.8,
    },
    input: {
      flex: 1,
      textAlignVertical: "top",
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.typography.body.fontSize,
      lineHeight: t.typography.body.lineHeight,
      color: t.colors.textDark,
      ...Platform.select({
        web: {
          outlineWidth: 0,
          outlineColor: "transparent",
          borderWidth: 0,
          backgroundColor: "transparent",
        } as TextStyle,
        default: {},
      }),
    },
    errorLabel: {
      color: t.colors.error,
      marginTop: t.spacing.xs,
      paddingLeft: t.spacing.sm,
    },
  };
}
