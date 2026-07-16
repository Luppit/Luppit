import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import type { PopupSuccessConfig } from "@/src/services/popup.service";
import { Theme, useTheme } from "@/src/themes";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const PARTICLES = [
  { x: -74, y: -48, rotation: -95, color: "primary", shape: "round" },
  { x: -90, y: -20, rotation: -125, color: "secondaryLight", shape: "rect" },
  { x: -52, y: -78, rotation: -45, color: "secondary", shape: "rect" },
  { x: -38, y: -96, rotation: -20, color: "info", shape: "round" },
  { x: -24, y: -88, rotation: 30, color: "secondaryLight", shape: "round" },
  { x: -4, y: -76, rotation: 52, color: "primary", shape: "rect" },
  { x: 16, y: -92, rotation: 75, color: "info", shape: "rect" },
  { x: 34, y: -86, rotation: 92, color: "secondary", shape: "round" },
  { x: 48, y: -72, rotation: 115, color: "primary", shape: "round" },
  { x: 68, y: -58, rotation: 132, color: "info", shape: "rect" },
  { x: 76, y: -42, rotation: 145, color: "secondary", shape: "rect" },
  { x: 90, y: -16, rotation: 165, color: "primary", shape: "round" },
  { x: -82, y: 4, rotation: -140, color: "info", shape: "rect" },
  { x: -58, y: 36, rotation: -70, color: "secondaryLight", shape: "round" },
  { x: 58, y: 34, rotation: 65, color: "primary", shape: "rect" },
  { x: 84, y: 2, rotation: 135, color: "secondaryLight", shape: "round" },
] as const;

type SuccessPopupContentProps = {
  config: PopupSuccessConfig;
  pending: boolean;
  onAction: () => void;
};

export default function SuccessPopupContent({
  config,
  pending,
  onAction,
}: SuccessPopupContentProps) {
  const t = useTheme();
  const s = useMemo(() => createSuccessPopupContentStyles(t), [t]);
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const particleColors = useMemo(
    () => ({
      primary: t.colors.primary,
      secondary: t.colors.secondary,
      secondaryLight: t.colors.secondaryLight,
      info: t.colors.info,
    }),
    [t]
  );

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion == null) return;
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 820,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  const successScale =
    reduceMotion === false
      ? progress.interpolate({
          inputRange: [0, 0.45, 0.7, 1],
          outputRange: [0.86, 1.06, 0.98, 1],
        })
      : 1;

  return (
    <View style={s.content}>
      <View
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={s.celebration}
      >
        {reduceMotion === false
          ? PARTICLES.map((particle, index) => {
              const translateX = progress.interpolate({
                inputRange: [0, 0.72, 1],
                outputRange: [0, particle.x * 0.9, particle.x],
              });
              const translateY = progress.interpolate({
                inputRange: [0, 0.72, 1],
                outputRange: [0, particle.y, particle.y + 16],
              });
              const rotate = progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", `${particle.rotation}deg`],
              });
              const opacity = progress.interpolate({
                inputRange: [0, 0.12, 0.72, 1],
                outputRange: [0, 1, 0.92, 0],
              });

              return (
                <Animated.View
                  key={`${particle.x}-${particle.y}`}
                  style={[
                    s.particle,
                    particle.shape === "round" ? s.roundParticle : null,
                    {
                      backgroundColor: particleColors[particle.color],
                      opacity,
                      transform: [
                        { translateX },
                        { translateY },
                        { rotate },
                        { scale: index % 2 === 0 ? 1 : 0.82 },
                      ],
                    },
                  ]}
                />
              );
            })
          : null}

        <Animated.View
          style={[
            s.successHalo,
            {
              backgroundColor: t.colors.primaryLight,
              transform: [{ scale: successScale }],
            },
          ]}
        >
          <View style={[s.successMark, { backgroundColor: t.colors.primary }]}>
            <Icon name="check" size={42} color={t.colors.backgroudWhite} />
          </View>
          <View style={s.sparkles}>
            <Icon name="sparkles" size={24} color={t.colors.secondary} />
          </View>
        </Animated.View>
      </View>

      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${config.title}. ${config.description}`}
        style={s.message}
      >
        <Text variant="title" align="center">
          {config.title}
        </Text>
        <Text variant="body" color="textMedium" align="center">
          {config.description}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={config.actionLabel}
        accessibilityHint="Abre el detalle recién creado"
        accessibilityState={{ busy: pending, disabled: pending }}
        disabled={pending}
        onPress={onAction}
        style={({ pressed }) => [
          s.action,
          {
            backgroundColor:
              t.colors[config.actionBackgroundColorKey ?? "primary"],
          },
          pressed && !pending ? s.actionPressed : null,
        ]}
      >
        {pending ? (
          <ActivityIndicator size="small" color={t.colors.backgroudWhite} />
        ) : (
          <>
            <Text variant="body" style={{ color: t.colors.backgroudWhite }}>
              {config.actionLabel}
            </Text>
            <Icon name="arrow-right" size={20} color={t.colors.backgroudWhite} />
          </>
        )}
      </Pressable>
    </View>
  );
}

function createSuccessPopupContentStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      alignItems: "stretch",
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.md,
      gap: t.spacing.lg,
    },
    celebration: {
      width: 184,
      height: 154,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
    },
    successHalo: {
      width: 132,
      height: 132,
      borderRadius: 66,
      alignItems: "center",
      justifyContent: "center",
    },
    successMark: {
      width: 82,
      height: 82,
      borderRadius: 41,
      alignItems: "center",
      justifyContent: "center",
    },
    sparkles: {
      position: "absolute",
      right: t.spacing.xs,
      top: t.spacing.sm,
    },
    particle: {
      position: "absolute",
      left: 86,
      top: 78,
      width: 8,
      height: 15,
      borderRadius: 2,
    },
    roundParticle: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    message: {
      alignItems: "center",
      gap: t.spacing.sm,
    },
    action: {
      minHeight: 54,
      borderRadius: t.borders.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    actionPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
  });
}
