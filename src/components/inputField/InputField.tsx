import { colors, useTheme } from "@/src/themes";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleProp,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { createInputFieldStyles } from "./styles";
import { LucideIconName } from "@/src/icons/lucide";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  hasError?: boolean;
  leftIcon?: LucideIconName;
  rightIcon?: LucideIconName;
  readOnly?: boolean;
  onPress?: () => void;
  baseContainerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  hasError,
  leftIcon,
  rightIcon,
  readOnly = false,
  onPress,
  baseContainerStyle,
  inputContainerStyle,
  inputStyle,
  ...props
}) => {
  const t = useTheme();
  const s = useMemo(() => createInputFieldStyles(t), [t]);
  const [focused, setFocused] = useState(false);

  const { children, ...textInputProps } = props as TextInputProps & {
    children?: never;
  };
  const displayValue =
    typeof textInputProps.value === "string" && textInputProps.value.length > 0
      ? textInputProps.value
      : textInputProps.placeholder ?? "";
  const isPlaceholder = !(typeof textInputProps.value === "string" && textInputProps.value.length > 0);

  return (
    <View style={[s.baseContainer, baseContainerStyle]}>
      {label ? (
        <Text color="stateAnulated" style={s.label}>
          {label}:
        </Text>
      ) : null}
      <View
        style={[
          s.inputContainer,
          focused && s.inputFocused,
          hasError && s.inputError,
          inputContainerStyle,
        ]}
      >
        {readOnly ? (
          <Pressable style={s.inputContent} onPress={onPress}>
            {leftIcon ? <Icon name={leftIcon} size={20} color={colors.stateAnulated} /> : null}
            <Text
              style={[
                s.input,
                inputStyle,
                isPlaceholder ? { color: colors.stateAnulated } : null,
              ]}
              numberOfLines={1}
            >
              {displayValue}
            </Text>
            {rightIcon ? <Icon name={rightIcon} size={20} color={colors.stateAnulated} /> : null}
          </Pressable>
        ) : (
          <View style={s.inputContent}>
            {leftIcon ? <Icon name={leftIcon} size={20} color={colors.stateAnulated} /> : null}
            <TextInput
              {...textInputProps}
              style={[s.input, inputStyle]}
              onFocus={(event) => {
                setFocused(true);
                textInputProps.onFocus?.(event);
              }}
              onBlur={(event) => {
                setFocused(false);
                textInputProps.onBlur?.(event);
              }}
              placeholderTextColor={colors.stateAnulated}
            />
            {rightIcon ? <Icon name={rightIcon} size={20} color={colors.stateAnulated} /> : null}
          </View>
        )}
      </View>
      {Boolean(error) && (
        <Text color="error" style={s.errorLabel}>
          {error}
        </Text>
      )}
    </View>
  );
};
