import { useTheme } from "@/src/themes/ThemeProvider";
import { Link } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, TextStyle, View } from "react-native";
import { Icon } from "../Icon";
import { createNavbarStyles } from "./styles";
import type { NavItem } from "./useNavItems";

type Props = { item: NavItem; active: boolean };

export default function NavbarItem({ item, active }: Props) {
  const t = useTheme();
  const s = React.useMemo(() => createNavbarStyles(t), [t]);

  const flat = StyleSheet.flatten([s.label, active && s.labelActive]) as TextStyle;
  const labelColor = (flat.color ?? s._colors.text) as string;

  return (
    <Link href={item.href} asChild prefetch>
      <Pressable
        style={s.item}
        android_ripple={Platform.OS === "android" ? { color: s._colors.ripple, borderless: true } : undefined}
        hitSlop={12}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={item.label}
        disabled={active}
        testID={`tab-${item.name}`}
      >
        <View style={s.itemInner}>
          <Icon name={item.icon} size={22} color={labelColor} />
          <Text style={[s.label, active && s.labelActive]}>{item.label}</Text>
        </View>
      </Pressable>
    </Link>
  );
}