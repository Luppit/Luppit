import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { LucideIconName } from "@/src/icons/lucide";
import { Theme, useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";

type LuppitChipProps = {
  label: string;
  selected?: boolean;
  count?: number | string | null;
  icon?: LucideIconName;
  onPress?: () => void;
  onRemove?: () => void;
  accessibilityLabel?: string;
  removeAccessibilityLabel?: string;
  labelMaxLines?: number;
  bordered?: boolean;
  style?: ViewStyle;
};

export default function LuppitChip({
  label,
  selected = false,
  count,
  icon,
  onPress,
  onRemove,
  accessibilityLabel,
  removeAccessibilityLabel,
  labelMaxLines = 1,
  bordered = false,
  style,
}: LuppitChipProps) {
  const t = useTheme();
  const s = useMemo(() => createLuppitChipStyles(t), [t]);
  const contentColor = selected ? t.colors.backgroudWhite : t.colors.textDark;
  const countValue = count == null ? "" : String(count);

  const content = (
    <>
      {icon ? <Icon name={icon} size={16} color={contentColor} /> : null}
      <Text
        variant="body"
        maxLines={labelMaxLines}
        style={[s.label, selected ? s.labelSelected : null]}
      >
        {label}
      </Text>
      {countValue ? (
        <View style={[s.countBadge, selected ? s.countBadgeSelected : null]}>
          <Text
            variant="small"
            maxLines={1}
            style={[s.countText, selected ? s.countTextSelected : null]}
          >
            {countValue}
          </Text>
        </View>
      ) : null}
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={removeAccessibilityLabel ?? `Quitar ${label}`}
          hitSlop={8}
          onPress={onRemove}
          style={s.removeButton}
        >
          <Icon name="x" size={16} color={contentColor} />
        </Pressable>
      ) : null}
    </>
  );

  const chipStyle = [
    s.chip,
    countValue ? s.chipWithCount : null,
    bordered ? s.chipBordered : null,
    selected ? s.chipSelected : null,
    bordered && selected ? s.chipBorderedSelected : null,
    onRemove ? s.chipRemovable : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        style={chipStyle}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={chipStyle}>{content}</View>;
}

function createLuppitChipStyles(t: Theme) {
  return StyleSheet.create({
    chip: {
      maxWidth: "100%",
      minHeight: 44,
      borderRadius: 999,
      ...createRoundedSurfaceStyle(t),
      paddingLeft: t.spacing.md,
      paddingRight: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.xs,
    },
    chipSelected: {
      backgroundColor: t.colors.textDark,
    },
    chipBordered: {
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    chipBorderedSelected: {
      borderColor: t.colors.textDark,
    },
    chipWithCount: {
      gap: t.spacing.sm,
      paddingRight: t.spacing.sm,
    },
    chipRemovable: {
      paddingRight: t.spacing.xs,
    },
    label: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
    labelSelected: {
      color: t.colors.backgroudWhite,
    },
    countBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.background,
    },
    countBadgeSelected: {
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    countText: {
      color: t.colors.textMedium,
    },
    countTextSelected: {
      color: t.colors.backgroudWhite,
    },
    removeButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
