import { useTheme } from "@/src/themes";
import React, { useMemo, useState } from "react";
import {
  StyleProp,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "../Text";
import { createTextAreaStyles } from "./styles";

type TextAreaProps = Omit<TextInputProps, "children"> & {
  label?: string;
  error?: string;
  hasError?: boolean;
  disabled?: boolean;
  baseContainerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export default function TextArea({
  label,
  error,
  hasError,
  disabled,
  baseContainerStyle,
  inputContainerStyle,
  inputStyle,
  multiline = true,
  onFocus,
  onBlur,
  ...props
}: TextAreaProps) {
  const t = useTheme();
  const s = useMemo(() => createTextAreaStyles(t), [t]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[s.baseContainer, baseContainerStyle]}>
      {label ? <Text color="stateAnulated" style={s.label}>{label}</Text> : null}

      <View
        style={[
          s.inputContainer,
          focused && s.inputContainerFocused,
          hasError && s.inputContainerError,
          disabled && s.inputContainerDisabled,
          inputContainerStyle,
        ]}
      >
        <TextInput
          {...props}
          multiline={multiline}
          editable={!disabled}
          style={[s.input, inputStyle]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={t.colors.border}
        />
      </View>

      {Boolean(error) ? (
        <Text color="error" style={s.errorLabel}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
