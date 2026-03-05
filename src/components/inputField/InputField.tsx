import { colors, useTheme } from "@/src/themes";
import { useMemo, useState } from "react";
import {
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
  baseContainerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  hasError,
  leftIcon,
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
        <View style={s.inputContent}>
          {leftIcon ? <Icon name={leftIcon} size={20} color={colors.stateAnulated} /> : null}
          <TextInput
            {...textInputProps}
            style={[s.input, inputStyle]}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholderTextColor={colors.stateAnulated}
          />
        </View>
      </View>
      {Boolean(error) && (
        <Text color="error" style={s.errorLabel}>
          {error}
        </Text>
      )}
    </View>
  );
};
