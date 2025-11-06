import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type InputPhoneStyles = {
  label: TextStyle;
  input: TextStyle;
  baseInputContainer?: ViewStyle;
  country: {
    countryCodeContainer?: ViewStyle;
    countryCodeText?: TextStyle;
  };
  inputContainer: ViewStyle;
  inputFocused?: ViewStyle;
  error: {
    errorLabel?: TextStyle;
    inputError?: ViewStyle;
  };
};

export function createInputPhoneStyles(t: Theme): InputPhoneStyles {
  return {
    label: {
      paddingLeft: t.spacing.sm,
    },
    baseInputContainer: {
        paddingHorizontal: t.spacing.sm,
        flex: 1,
    },
    inputContainer: {
      borderWidth: 1,
      borderRadius: t.borders.sm,
      borderColor: t.colors.border,
      height: 44,
      marginBottom: t.spacing.lg,
      flexDirection: "row",
    },
    inputFocused: {
        borderWidth: 2
    },
    error: {
      errorLabel: {
        color: t.colors.error,
        marginTop: t.spacing.sm,
      },
      inputError: {
        borderColor: t.colors.error,
      }
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
    country: {
      countryCodeContainer: {
        borderRightWidth: 1,
        borderColor: t.colors.border,
        width: 66,
        justifyContent: "center",
        alignItems: "center",
      },
      countryCodeText: {
        fontFamily: t.typography.body.fontFamily,
      },
    },
  };
}
