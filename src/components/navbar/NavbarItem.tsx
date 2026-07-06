import { useTheme } from "@/src/themes/ThemeProvider";
import { Link } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, TextStyle, View } from "react-native";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { createNavbarStyles } from "./styles";
import type { NavItem } from "./useNavItems";

type Props = { item: NavItem; active: boolean; disabled?: boolean };

export default function NavbarItem({ item, active, disabled = false }: Props) {
  const t = useTheme();
  const s = React.useMemo(() => createNavbarStyles(t), [t]);

  const flat = StyleSheet.flatten([
    s.label,
    active && s.labelActive,
    disabled && s.labelDisabled,
  ]) as TextStyle;
  const labelColor = (flat.color ?? s._colors.text) as string;

  const content = (
    <Pressable
      style={s.item}
      android_ripple={
        Platform.OS === "android"
          ? { color: s._colors.ripple, borderless: false }
          : undefined
      }
      hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={item.label}
      disabled={active || disabled}
      testID={`tab-${item.name}`}
    >
      <View style={[s.itemInner, active && s.itemInnerActive, disabled && s.itemInnerDisabled]}>
        <View style={s.iconSlot}>
          {item.icon ? <Icon name={item.icon} size={22} color={labelColor} /> : null}
        </View>
        <Text
          variant="small"
          maxLines={1}
          ellipsizeMode="tail"
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[s.label, active && s.labelActive, disabled && s.labelDisabled]}
        >
          {item.label}
        </Text>
      </View>
    </Pressable>
  );

  if (disabled) return content;

  return (
    <Link href={item.href} asChild prefetch>
      {content}
    </Link>
  );
}
