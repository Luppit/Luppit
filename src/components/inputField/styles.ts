import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type InputFieldStyles = {
  label: TextStyle;
  input: TextStyle;
  inputError?: ViewStyle;
  inputFocused?: ViewStyle;
  inputContainer: ViewStyle;
  errorLabel?: TextStyle;
};

export function createInputFieldStyles(t: Theme): InputFieldStyles {
  return {
    label: {
      paddingLeft: t.spacing.sm,
    },
    inputContainer: {
      borderWidth: 1,
      borderRadius: t.borders.sm,
      borderColor: t.colors.border,
      height: 44,
      paddingHorizontal: t.spacing.sm,
      marginBottom: t.spacing.lg,
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
        default: {},
      }),
    },
    inputError: {
      borderColor: t.colors.error,
    },
    inputFocused: {
      borderWidth: 2,
    },
    errorLabel: {
        color: t.colors.error,
        marginTop: t.spacing.sm,
    }
  };
}
