import GlassSurface from "@/src/components/glass/GlassSurface";
import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { getToastVariantPresentation } from "@/src/components/toast/presentation";
import type { ToastMessage } from "@/src/services/toast.service";
import { fontFamilies, useTheme } from "@/src/themes";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

type ToastCardProps = {
  toast: ToastMessage;
  reduceTransparency: boolean;
  actionPending: boolean;
  onActionPress: () => void;
};

function getVisibleCopy(toast: ToastMessage) {
  const title = toast.title?.trim();
  const description = toast.description?.trim();

  if (title) return { title, description };
  if (description) return { title: description, description: undefined };

  return { title: "Notificación", description: undefined };
}

export default function ToastCard({
  toast,
  reduceTransparency,
  actionPending,
  onActionPress,
}: ToastCardProps) {
  const t = useTheme();
  const presentation = getToastVariantPresentation(toast.variant, t.colors);
  const copy = getVisibleCopy(toast);

  return (
    <GlassSurface
      variant="surface"
      blur={reduceTransparency ? false : "surface"}
      style={[
        styles.surface,
        reduceTransparency ? { backgroundColor: t.colors.backgroudWhite } : null,
      ]}
      contentStyle={styles.content}
    >
      <View
        pointerEvents="none"
        style={[styles.badge, { backgroundColor: presentation.badgeColor }]}
      >
        <Icon
          name={presentation.icon}
          size={19}
          strokeWidth={2.25}
          color={presentation.iconColor}
        />
      </View>

      <View style={styles.copy}>
        <Text
          variant="body"
          maxLines={2}
          style={styles.title}
        >
          {copy.title}
        </Text>
        {copy.description ? (
          <Text
            variant="small"
            color="textMedium"
            maxLines={3}
            style={styles.description}
          >
            {copy.description}
          </Text>
        ) : null}
      </View>

      {toast.action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${toast.action.label}. ${copy.title}`}
          accessibilityHint="Activa la acción de esta notificación"
          disabled={actionPending}
          hitSlop={4}
          onPress={onActionPress}
          style={({ pressed }) => [
            styles.action,
            pressed || actionPending ? styles.actionPressed : null,
          ]}
        >
          <Text
            variant="small"
            color="textDark"
            maxLines={1}
            style={styles.actionLabel}
          >
            {toast.action.label}
          </Text>
        </Pressable>
      ) : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    width: "100%",
  },
  content: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamilies.medium,
  },
  description: {
    marginTop: 2,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    maxWidth: 112,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  actionPressed: {
    opacity: 0.56,
  },
  actionLabel: {
    fontFamily: fontFamilies.semibold,
  },
});
