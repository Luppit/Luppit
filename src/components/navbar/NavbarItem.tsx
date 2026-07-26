import { useTheme } from "@/src/themes/ThemeProvider";
import { Asset } from "expo-asset";
import { Link } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, TextStyle, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { createNavbarStyles } from "./styles";
import type { NavItem } from "./useNavItems";

type Props = {
  item: NavItem;
  active: boolean;
  disabled?: boolean;
  unreadNotificationCount?: number;
};

const homeLogoAsset = Asset.fromModule(
  require("../../../assets/images/logo-icon.svg"),
);

export default function NavbarItem({
  item,
  active,
  disabled = false,
  unreadNotificationCount = 0,
}: Props) {
  const t = useTheme();
  const s = React.useMemo(() => createNavbarStyles(t), [t]);

  const flat = StyleSheet.flatten([
    s.label,
    active && s.labelActive,
    disabled && s.labelDisabled,
  ]) as TextStyle;
  const labelColor = (flat.color ?? s._colors.text) as string;
  const isHomeItem = String(item.href) === "/";
  const unreadCount = Math.max(0, Math.trunc(unreadNotificationCount));
  const accessibilityLabel =
    unreadCount <= 0
      ? item.label
      : unreadCount === 1
        ? `${item.label}, 1 notificación sin leer`
        : `${item.label}, ${unreadCount > 99 ? "99 o más" : unreadCount} notificaciones sin leer`;

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
      accessibilityLabel={accessibilityLabel}
      disabled={active || disabled}
      testID={`tab-${item.name}`}
    >
      <View style={[s.itemInner, active && s.itemInnerActive, disabled && s.itemInnerDisabled]}>
        <View style={s.iconSlot}>
          {isHomeItem && homeLogoAsset.uri ? (
            <SvgUri uri={homeLogoAsset.uri} width={18} height={24} />
          ) : item.icon ? (
            <Icon name={item.icon} size={22} color={labelColor} />
          ) : null}
          {unreadCount > 0 ? (
            <View
              style={s.notificationDot}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
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
