import { LucideIconName } from "@/src/icons/lucide";
import { TextVariant } from "@/src/themes";
import { useTheme } from "@/src/themes/ThemeProvider";
import React from "react";
import { ActivityIndicator, Pressable, TextStyle, View } from "react-native";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { ButtonVariant, createButtonStyles } from "./styles";

export type ButtonProps = {
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  shadow?: boolean;
  textVariant?: TextVariant;
  variant?: ButtonVariant;
  labelStyle?: TextStyle | TextStyle[];
  icon?: LucideIconName;
  iconSize?: number;
};

export default function Button({
  title,
  onPress,
  disabled,
  loading = false,
  shadow = false,
  variant = "dark",
  textVariant = "body",
  labelStyle,
  icon,
  iconSize,
}: ButtonProps) {
  const t = useTheme();
  const s = React.useMemo(() => createButtonStyles(t), [t]);
  const isDisabled = disabled || loading;
  const v: ButtonVariant = disabled && !loading ? "disabled" : variant;
  const contentColor = (s.variants.label[v] as any).color;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [
          s.base.container,
          s.variants.container[v],
          shadow && s.base.shadow,
          pressed && !isDisabled && s.states.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : icon ? (
          <Icon name={icon} size={iconSize ?? 20} color={contentColor} />
        ) : null}
        <Text
          variant={textVariant}
          style={[s.base.label, s.variants.label[v], labelStyle]}
        >
          {title}
        </Text>
      </Pressable>
    </View>
  );
}
