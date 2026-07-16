import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { LucideIconName } from "@/src/icons/lucide";
import { Theme, useTheme } from "@/src/themes";
import React, { ReactNode, useMemo } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";

type GroupedListProps = {
  children: ReactNode;
  style?: ViewStyle;
};

type GroupedListSectionProps = GroupedListProps & {
  title: string;
};

type GroupedListRowProps = {
  icon: LucideIconName;
  label: string;
  value?: string | null;
  description?: string | null;
  destructive?: boolean;
  showSeparator?: boolean;
  showChevron?: boolean;
  descriptionMaxLines?: number;
  rightAccessory?: ReactNode;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export function GroupedList({ children, style }: GroupedListProps) {
  const t = useTheme();
  const s = useMemo(() => createGroupedListStyles(t), [t]);

  return <View style={[s.group, style]}>{children}</View>;
}

export function GroupedListSection({
  title,
  children,
  style,
}: GroupedListSectionProps) {
  const t = useTheme();
  const s = useMemo(() => createGroupedListStyles(t), [t]);

  return (
    <View style={[s.section, style]}>
      <Text variant="small" color="textMedium" style={s.sectionTitle}>
        {title}
      </Text>
      <GroupedList>{children}</GroupedList>
    </View>
  );
}

export function GroupedListRow({
  icon,
  label,
  value,
  description,
  destructive = false,
  showSeparator = true,
  showChevron,
  descriptionMaxLines = 2,
  rightAccessory,
  accessibilityLabel,
  onPress,
}: GroupedListRowProps) {
  const t = useTheme();
  const s = useMemo(() => createGroupedListStyles(t), [t]);
  const contentColor = destructive ? t.colors.error : t.colors.textDark;
  const hasDescription = Boolean(description);
  const hasValue = Boolean(value);
  const hasRoomyDescription = hasDescription && descriptionMaxLines > 2;
  const shouldShowChevron = showChevron ?? (Boolean(onPress) && !destructive);
  const content = (
    <>
      <View style={s.iconSlot}>
        <Icon name={icon} size={21} color={contentColor} />
      </View>
      <View
        style={[
          s.rowText,
          hasDescription ? s.rowTextWithDescription : null,
          hasValue ? s.rowTextWithValue : null,
          hasRoomyDescription ? s.rowTextWithRoomyDescription : null,
        ]}
      >
        <View style={[s.rowMainLine, hasValue ? s.rowMainLineWithValue : null]}>
          <Text
            variant="body"
            style={[s.rowLabel, { color: contentColor }]}
            maxLines={hasValue ? 2 : 1}
          >
            {label}
          </Text>
          {value ? (
            <Text color="stateAnulated" maxLines={2} style={s.rowValue}>
              {value}
            </Text>
          ) : null}
        </View>
        {description ? (
          <Text variant="small" color="stateAnulated" maxLines={descriptionMaxLines}>
            {description}
          </Text>
        ) : null}
        {showSeparator ? <View style={s.rowSeparator} /> : null}
      </View>
      {rightAccessory}
      {shouldShowChevron ? (
        <Icon name="arrow-right" size={18} color={t.colors.stateAnulated} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        style={[
          s.row,
          hasDescription ? s.rowWithDescription : null,
          hasValue ? s.rowWithValue : null,
          hasRoomyDescription ? s.rowWithRoomyDescription : null,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        s.row,
        hasDescription ? s.rowWithDescription : null,
        hasValue ? s.rowWithValue : null,
        hasRoomyDescription ? s.rowWithRoomyDescription : null,
      ]}
    >
      {content}
    </View>
  );
}

function createGroupedListStyles(t: Theme) {
  return StyleSheet.create({
    section: {
      gap: t.spacing.sm,
    },
    sectionTitle: {
      paddingLeft: t.spacing.md,
    },
    group: {
      overflow: "hidden",
      ...createRoundedSurfaceStyle(t),
    },
    row: {
      minHeight: 54,
      paddingLeft: t.spacing.md,
      paddingRight: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    rowWithDescription: {
      minHeight: 74,
      paddingVertical: t.spacing.sm,
    },
    rowWithValue: {
      minHeight: 66,
      paddingVertical: t.spacing.sm,
    },
    rowWithRoomyDescription: {
      minHeight: 96,
      paddingVertical: t.spacing.md,
    },
    iconSlot: {
      width: 32,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: {
      flex: 1,
      minHeight: 54,
      justifyContent: "center",
    },
    rowTextWithDescription: {
      minHeight: 58,
      gap: 2,
    },
    rowTextWithValue: {
      minHeight: 50,
    },
    rowTextWithRoomyDescription: {
      minHeight: 72,
      gap: t.spacing.xs,
      paddingBottom: t.spacing.sm,
    },
    rowMainLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    rowMainLineWithValue: {
      alignItems: "center",
    },
    rowLabel: {
      flex: 1,
      minWidth: 0,
    },
    rowValue: {
      minWidth: 112,
      maxWidth: 176,
      flexShrink: 1,
      textAlign: "right",
    },
    rowSeparator: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(0,0,0,0.08)",
    },
  });
}
