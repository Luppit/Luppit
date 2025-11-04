import { LucideIconName } from "@/src/icons/lucide";
import { TextVariant } from "@/src/themes";
import { useTheme } from "@/src/themes/ThemeProvider";
import React from "react";
import { Pressable, TextStyle, View } from "react-native";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { ButtonVariant, createButtonStyles } from "./styles";

export type ButtonProps = {
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
  textVariant?: TextVariant,
  variant?: ButtonVariant;
  labelStyle?: TextStyle | TextStyle[];
  icon?: LucideIconName;
  iconSize?: number;
}

export default function Button({
  title,
  onPress,
  disabled,
  variant = "dark",
  textVariant = "body",
  labelStyle,
  icon,
  iconSize
}: ButtonProps) {
  const t = useTheme();
  const s = React.useMemo(() => createButtonStyles(t), [t]);
  const v : ButtonVariant = disabled ? "disabled" : variant;

  return (
    <View>
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        s.base.container,
        s.variants.container[v],
        pressed && !disabled && s.states.pressed,
      ]}
    >
      {icon && <Icon name={icon} size={iconSize ?? 20} color={(s.variants.label[v] as any).color} />}
      <Text variant={textVariant} style={[s.base.label, s.variants.label[v], labelStyle]}>
        {title}
      </Text>
    </Pressable> 
    </View>
  );
}