import GlassSurface from "@/src/components/glass/GlassSurface";
import { Text } from "@/src/components/Text";
import {
  createRoundedSurfaceStyle,
  ROUNDED_SURFACE_RADIUS,
} from "@/src/components/surface/styles";
import { Theme, useTheme } from "@/src/themes";
import React, { ReactNode, useMemo, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

type MarketplaceCardFrameProps = {
  title: string;
  subtitle?: string | null;
  headerMeta?: ReactNode;
  body?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  compact?: boolean;
  glassSurface?: boolean;
  fullText?: boolean;
  prominentTitle?: boolean;
  footerDivider?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
};

export default function MarketplaceCardFrame({
  title,
  subtitle,
  headerMeta,
  body,
  footerLeft,
  footerRight,
  compact = false,
  glassSurface = false,
  fullText = false,
  prominentTitle = false,
  footerDivider = false,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
}: MarketplaceCardFrameProps) {
  const t = useTheme();
  const s = useMemo(() => createMarketplaceCardFrameStyles(t, compact), [compact, t]);
  const didLongPressRef = useRef(false);

  const content = (
    <>
      <View style={[s.heading, headerMeta ? s.headingWithMeta : null]}>
        {headerMeta}
        <Text
          variant={prominentTitle ? "subtitle" : "body"}
          maxLines={fullText ? undefined : 2}
          style={s.title}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="small"
            color="stateAnulated"
            maxLines={fullText ? undefined : 1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {body}

      {footerLeft || footerRight ? (
        <>
          {footerDivider ? <View style={s.footerDivider} /> : null}
          <View style={s.footer}>
            <View style={s.footerLeft}>{footerLeft}</View>
            {footerRight}
          </View>
        </>
      ) : null}
    </>
  );

  const card = glassSurface ? (
    <GlassSurface
      variant="surface"
      blur={false}
      highlight
      style={s.glassSurface}
      clipStyle={s.glassClip}
      contentStyle={[s.cardContent, s.glassContent]}
    >
      {content}
    </GlassSurface>
  ) : (
    <View style={[s.cardContent, s.plainSurface]}>{content}</View>
  );

  if (!onPress && !onLongPress) return card;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityActions={
        onLongPress
          ? [
              { name: "activate", label: "Abrir" },
              { name: "longpress", label: "Ver opciones" },
            ]
          : undefined
      }
      onAccessibilityAction={
        onLongPress
          ? (event) => {
              if (event.nativeEvent.actionName === "activate") onPress?.();
              if (event.nativeEvent.actionName === "longpress") onLongPress();
            }
          : undefined
      }
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
    cardContent: {
      minHeight: compact ? 154 : 142,
      padding: t.spacing.md,
      justifyContent: "space-between",
      gap: t.spacing.md,
    },
    plainSurface: {
      ...createRoundedSurfaceStyle(t),
    },
    glassSurface: {
      borderRadius: ROUNDED_SURFACE_RADIUS,
      flex: compact ? 1 : undefined,
    },
    glassClip: {
      borderRadius: ROUNDED_SURFACE_RADIUS,
    },
    glassContent: {
      borderRadius: ROUNDED_SURFACE_RADIUS,
      flex: compact ? 1 : undefined,
    },
    heading: {
      gap: 4,
    },
    headingWithMeta: {
      gap: t.spacing.sm,
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
    footerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.colors.border,
    },
    pressable: {
      width: compact ? 270 : "100%",
      alignSelf: compact ? "stretch" : undefined,
    },
  });
}
