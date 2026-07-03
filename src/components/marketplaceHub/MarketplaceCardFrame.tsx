import { Text } from "@/src/components/Text";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Theme, useTheme } from "@/src/themes";
import React, { ReactNode, useMemo, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type MarketplaceCardFrameProps = {
  title: string;
  subtitle?: string | null;
  body?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
};

export default function MarketplaceCardFrame({
  title,
  subtitle,
  body,
  footerLeft,
  footerRight,
  compact = false,
  onPress,
  onLongPress,
  accessibilityLabel,
}: MarketplaceCardFrameProps) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceCardFrameStyles(t, compact), [compact, t]);
  const didLongPressRef = useRef(false);

  const card = (
    <View style={s.card}>
      <View style={s.heading}>
        <Text variant="body" maxLines={2} style={s.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="stateAnulated" maxLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {body}

      {footerLeft || footerRight ? (
        <View style={s.footer}>
          <View style={s.footerLeft}>{footerLeft}</View>
          {footerRight}
        </View>
      ) : null}
    </View>
  );

  if (!onPress && !onLongPress) return card;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      delayLongPress={350}
      onPress={() => {
        if (didLongPressRef.current) {
          didLongPressRef.current = false;
          return;
        }
        onPress?.();
      }}
      onLongPress={() => {
        if (!onLongPress) return;
        didLongPressRef.current = true;
        onLongPress();
      }}
      onPressOut={() => {
        setTimeout(() => {
          didLongPressRef.current = false;
        }, 0);
      }}
      style={({ pressed }) => [
        s.pressable,
        {
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {card}
    </Pressable>
  );
}

function createMarketplaceCardFrameStyles(t: Theme, compact: boolean) {
  return StyleSheet.create({
    card: {
      minHeight: compact ? 154 : 142,
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      justifyContent: "space-between",
      gap: t.spacing.md,
    },
    heading: {
      gap: 4,
    },
    title: {
      color: t.colors.textDark,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    footerLeft: {
      flex: 1,
      minWidth: 0,
    },
    pressable: {
      width: compact ? 270 : "100%",
    },
  });
}
