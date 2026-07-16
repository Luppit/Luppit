import { Icon } from "@/src/components/Icon";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { Theme, useTheme } from "@/src/themes";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

type StandaloneListEmptyStateProps = {
  icon: React.ComponentProps<typeof Icon>["name"];
  title: string;
  description: string;
  actionLabel?: string | null;
  actionIcon?: React.ComponentProps<typeof Icon>["name"];
  onAction?: () => void;
};

export default function StandaloneListEmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
}: StandaloneListEmptyStateProps) {
  const t = useTheme();
  const s = React.useMemo(() => createStandaloneListEmptyStateStyles(t), [t]);

  return (
    <View style={s.emptyState}>
      <View style={s.emptyIconBadge}>
        <Icon name={icon} size={24} color={t.colors.primary} />
      </View>
      <Text variant="body" style={s.emptyTitle} align="center">
        {title}
      </Text>
      <Text variant="small" color="stateAnulated" align="center" style={s.emptyDescription}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          style={s.emptyAction}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          {actionIcon ? <Icon name={actionIcon} size={16} color={t.colors.textDark} /> : null}
          <Text variant="body" style={s.emptyActionLabel}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStandaloneListEmptyStateStyles(t: Theme) {
  return StyleSheet.create({
    emptyState: {
      width: "100%",
      alignItems: "center",
      gap: t.spacing.sm,
      padding: t.spacing.lg,
      ...createRoundedSurfaceStyle(t),
    },
    emptyIconBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
      marginBottom: t.spacing.xs,
    },
    emptyTitle: {
      color: t.colors.textDark,
    },
    emptyDescription: {
      maxWidth: 260,
    },
    emptyAction: {
      minHeight: 36,
      borderRadius: 999,
      ...t.glass.chip,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.md,
      marginTop: t.spacing.xs,
    },
    emptyActionLabel: {
      color: t.colors.textDark,
    },
  });
}
