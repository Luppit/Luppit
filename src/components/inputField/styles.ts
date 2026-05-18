import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type InputFieldStyles = {
  baseContainer?: ViewStyle;
  label: TextStyle;
  inputContent: ViewStyle;
  input: TextStyle;
  inputError?: ViewStyle;
  inputFocused?: ViewStyle;
  inputContainer: ViewStyle;
  errorLabel?: TextStyle;
};

export function createInputFieldStyles(t: Theme): InputFieldStyles {
  return {
    baseContainer: {
      marginBottom: t.spacing.lg
    },
    label: {
      paddingLeft: t.spacing.sm
    },
    inputContainer: {
      borderWidth: 1,
      borderRadius: t.borders.md,
      borderColor: t.colors.border,
      height: 48,
      paddingHorizontal: t.spacing.md,
      backgroundColor: t.colors.backgroudWhite,
    },
    input: {
      flex: 1,
      fontFamily: t.typography.body.fontFamily,
      ...Platform.select({
        web: {
          outlineWidth: 0,
          outlineColor: "transparent",
          borderWidth: 0,
          backgroundColor: "transparent",
        } as TextStyle,
        default: {}
      }),
    },
    inputContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    inputError: {
      borderColor: t.colors.error
    },
    inputFocused: {
      borderColor: t.colors.primary,
    },
    errorLabel: {
      color: t.colors.error,
      marginTop: t.spacing.xs,
      paddingLeft: t.spacing.sm
    },
  };
}
