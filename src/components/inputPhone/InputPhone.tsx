import { useTheme } from "@/src/themes";
import { useMemo, useState } from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { Text } from "../Text";
import { createInputPhoneStyles } from "./styles";

type InputPhoneProps = TextInputProps & {
  label: string;
  countryCode?: string;
  error?: string;
  hasError?: boolean;
};

export const defaultCountryCode = "+506";

export const InputPhone = ({
  label,
  countryCode = defaultCountryCode,
  error,
  hasError,
  ...props
}: InputPhoneProps) => {
  const t = useTheme();
  const s = useMemo(() => createInputPhoneStyles(t), [t]);
  const [focused, setFocused] = useState(false);

  const { children, ...textInputProps } = props as TextInputProps & {
    children?: never;
  };

  return (
    <View style={s.phoneInputContainer}>
      <Text color="stateAnulated" style={s.label}>
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
          <Text style={s.country.countryCodeText} color="stateAnulated">
            {countryCode}
          </Text>
        </View>
        <View style={s.baseInputContainer}>
          <TextInput
            {...textInputProps}
            style={s.input}
            keyboardType="phone-pad"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholderTextColor={t.colors.stateAnulated}
          />
        </View>
      </View>
      {Boolean(error) && (
        <Text color="error" style={s.error.errorLabel}>
          {error}
        </Text>
      )}
    </View>
  );
};
