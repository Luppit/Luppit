import { Text } from "@/src/components/Text";
import { useTheme, type Theme } from "@/src/themes";
import React, { useMemo } from "react";
import { View } from "react-native";
import { createStatusChipStyles } from "./styles";

type StatusChipProps = {
  label: string;
  styleCode?: string | null;
};

type ThemeColors = Theme["colors"];
type ThemeColorKey = keyof ThemeColors;

function isThemeColorKey(value: string, colors: ThemeColors): value is ThemeColorKey {
  return Object.prototype.hasOwnProperty.call(colors, value);
}

function resolveStyleCodeColor(styleCode: string | null | undefined, colors: ThemeColors) {
  const value = styleCode?.toLowerCase().trim() ?? "";
  if (!value) return null;
  if (isThemeColorKey(value, colors)) return colors[value];
  if (value.includes("error") || value.includes("danger") || value.includes("destructive")) {
    return colors.error;
  }
  if (value.includes("warning")) return colors.warning;
  if (value.includes("info")) return colors.info;
  if (value.includes("primary") || value.includes("success") || value.includes("positive")) {
    return colors.primary;
  }
  return null;
}

function toTintBackground(color: string) {
  const hex = color.trim();
  const normalized =
    hex.length === 4 && hex.startsWith("#")
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;

  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) return null;

  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.18)`;
}

export default function StatusChip({ label, styleCode }: StatusChipProps) {
  const t = useTheme();
  const s = useMemo(() => createStatusChipStyles(t), [t]);
  const statusColor = resolveStyleCodeColor(styleCode, t.colors);
  const tintBackground = statusColor ? toTintBackground(statusColor) : null;

  return (
    <View
      style={[
        s.container,
        statusColor
          ? {
              backgroundColor: tintBackground ?? t.colors.backgroudWhite,
            }
          : null,
      ]}
    >
      <View style={[s.dot, statusColor ? { backgroundColor: statusColor } : null]} />
      <Text variant="body" maxLines={1} style={s.label}>
        {label}
      </Text>
    </View>
  );
}
