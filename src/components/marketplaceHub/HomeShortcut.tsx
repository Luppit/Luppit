import { Icon } from "@/src/components/Icon";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { Theme, useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export default function HomeShortcut({
  icon,
  title,
  description,
  accessibilityLabel,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  description: string;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createHomeShortcutStyles(t), [t]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [s.shortcut, pressed ? s.shortcutPressed : null]}
    >
      <View style={s.shortcutContent}>
        <View style={s.shortcutIcon}>
          <Icon name={icon} size={20} color={t.colors.primary} />
        </View>
        <View style={s.shortcutText}>
          <Text variant="body" style={s.shortcutTitle}>
            {title}
          </Text>
          <Text variant="body" color="stateAnulated">
            {description}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={t.colors.stateAnulated} />
      </View>
    </Pressable>
  );
}

function createHomeShortcutStyles(t: Theme) {
  return StyleSheet.create({
    shortcut: {
      alignSelf: "stretch",
      marginHorizontal: t.spacing.md,
      ...createRoundedSurfaceStyle(t),
    },
    shortcutPressed: {
      opacity: 0.78,
    },
    shortcutContent: {
      minHeight: 80,
      padding: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    shortcutIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
    },
    shortcutText: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    shortcutTitle: {
      color: t.colors.textDark,
    },
  });
}
