import { useTheme } from "@/src/themes";
import { useMemo, useState } from "react";
import {
  StyleProp,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "../Text";
import type { TextProps } from "../Text";
import { useStepperKeyboard } from "../stepper/StepperKeyboardContext";
import { createInputPhoneStyles } from "./styles";

type InputPhoneProps = TextInputProps & {
  label: string;
  countryCode?: string;
  error?: string;
  hasError?: boolean;
  baseContainerStyle?: StyleProp<ViewStyle>;
  labelColor?: TextProps["color"];
};

export const defaultCountryCode = "+506";

export const InputPhone = ({
  label,
  countryCode = defaultCountryCode,
  error,
  hasError,
  baseContainerStyle,
  labelColor = "stateAnulated",
  ...props
}: InputPhoneProps) => {
  const t = useTheme();
  const s = useMemo(() => createInputPhoneStyles(t), [t]);
  const stepperKeyboard = useStepperKeyboard();
  const [focused, setFocused] = useState(false);

  const { children, ...textInputProps } = props as TextInputProps & {
    children?: never;
  };

  return (
    <View style={[s.phoneInputContainer, baseContainerStyle]}>
      <Text color={labelColor} style={s.label}>
        {label}:
      </Text>
      <View
        style={[
          s.inputContainer,
          focused && s.inputFocused,
          hasError && s.error.inputError,
        ]}
      >
        <View style={s.country.countryCodeContainer} pointerEvents="none">
          <Text style={s.country.countryCodeText} color="textMedium">
            {countryCode}
          </Text>
        </View>
        <View style={s.baseInputContainer}>
          <TextInput
            {...textInputProps}
            style={s.input}
            keyboardType="phone-pad"
            onFocus={(event) => {
              setFocused(true);
              stepperKeyboard?.scrollToFocusedInput(event.target);
              textInputProps.onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              textInputProps.onBlur?.(event);
            }}
            placeholderTextColor={t.colors.stateAnulated}
          />
        </View>
      </View>
      {Boolean(error) && (
        <Text
          color="error"
          style={s.error.errorLabel}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};
