import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";
import { createInputFieldStyles } from "../inputField/styles";

export type InputPhoneStyles = {
  label: TextStyle;
  input: TextStyle;
  phoneInputContainer?: ViewStyle; 
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
  const inputFieldStyles = createInputFieldStyles(t);

  return {
    label: inputFieldStyles.label,
    phoneInputContainer: inputFieldStyles.baseContainer,
    baseInputContainer: {
      ...inputFieldStyles.inputContent,
      paddingHorizontal: t.spacing.md,
    },
    inputContainer: {
      ...inputFieldStyles.inputContainer,
      paddingHorizontal: 0,
      flexDirection: "row",
    },
    inputFocused: inputFieldStyles.inputFocused,
    error: {
      errorLabel: inputFieldStyles.errorLabel,
      inputError: inputFieldStyles.inputError,
    },
    input: inputFieldStyles.input,
    country: {
      countryCodeContainer: {
        borderRightWidth: 1,
        borderColor: t.colors.border,
        paddingHorizontal: t.spacing.md,
        justifyContent: "center",
        alignItems: "center",
      },
      countryCodeText: {
        ...t.typography.body,
      },
    },
  };
}
