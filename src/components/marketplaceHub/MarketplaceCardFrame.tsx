import GlassSurface from "@/src/components/glass/GlassSurface";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { ReactNode, useRef } from "react";
import { Pressable, View } from "react-native";

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
  const didLongPressRef = useRef(false);

  const card = (
    <GlassSurface
      variant="surface"
      highlight
      style={{ borderRadius: 18 }}
      contentStyle={{
        minHeight: compact ? 154 : 142,
        borderRadius: 18,
        padding: t.spacing.md,
        justifyContent: "space-between",
        gap: t.spacing.md,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text variant="subtitle" maxLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color="stateAnulated" maxLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {body}

      {footerLeft || footerRight ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: t.spacing.sm,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>{footerLeft}</View>
          {footerRight}
        </View>
      ) : null}
    </GlassSurface>
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
      style={({ pressed }) => ({
        width: compact ? 270 : "100%",
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {card}
    </Pressable>
  );
}
