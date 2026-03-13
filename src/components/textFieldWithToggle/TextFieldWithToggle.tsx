import { colors, useTheme } from "@/src/themes";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Text } from "../Text";
import { createTextFieldWithToggleStyles } from "./styles";

export type ToggleOption<T extends string = string> = {
  label: string;
  value: T;
};

type TextFieldWithToggleProps<T extends string = string> = Omit<
  TextInputProps,
  "children" | "value" | "onChangeText"
> & {
  label?: string;
  error?: string;
  hasError?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  options: [ToggleOption<T>, ToggleOption<T>];
  selectedOption: T;
  onOptionChange: (value: T) => void;
  onChangeValue?: (payload: { value: string; option: T }) => void;
};

export default function TextFieldWithToggle<T extends string = string>({
  label,
  error,
  hasError,
  value,
  onChangeText,
  options,
  selectedOption,
  onOptionChange,
  onChangeValue,
  onFocus,
  onBlur,
  ...props
}: TextFieldWithToggleProps<T>) {
  const t = useTheme();
  const s = useMemo(() => createTextFieldWithToggleStyles(t), [t]);
  const [focused, setFocused] = useState(false);

  const handleChangeText = (text: string) => {
    onChangeText(text);
    onChangeValue?.({ value: text, option: selectedOption });
  };

  const handleOptionPress = (optionValue: T) => {
    onOptionChange(optionValue);
    onChangeValue?.({ value, option: optionValue });
  };

  return (
    <View style={s.container}>
      {label ? <Text color="stateAnulated" style={s.label}>{label}</Text> : null}

      <View style={s.row}>
        <View
          style={[
            s.inputContainer,
            focused && s.inputContainerFocused,
            hasError && s.inputContainerError,
          ]}
        >
          <TextInput
            {...props}
            value={value}
            onChangeText={handleChangeText}
            style={s.input}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            placeholderTextColor={colors.border}
          />
        </View>

        <View style={s.toggleContainer}>
          {options.map((option) => {
            const active = option.value === selectedOption;
            return (
              <Pressable
                key={option.value}
                onPress={() => handleOptionPress(option.value)}
                style={[
                  s.toggleOption,
                  active ? s.toggleOptionActive : s.toggleOptionInactive,
                  active ? { backgroundColor: t.colors.primary } : null,
                ]}
              >
                <Text
                  variant="caption"
                  style={[
                    s.toggleLabel,
                    { color: active ? t.colors.textDark : t.colors.stateAnulated },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {Boolean(error) ? (
        <Text color="error" style={s.errorLabel}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
