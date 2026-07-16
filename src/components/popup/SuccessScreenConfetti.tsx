import { Theme, useTheme } from "@/src/themes";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

const PARTICLE_COUNT = 42;
const COLOR_KEYS = [
  "primary",
  "secondary",
  "secondaryLight",
  "info",
  "accentYellow",
] as const satisfies readonly (keyof Theme["colors"])[];

type ConfettiShape = "rect" | "round" | "cross";

export default function SuccessScreenConfetti() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const startRatio = 0.06 + (((index * 37) % 89) / 100) * 0.98;
        const endRatio = 0.02 + (((index * 61 + 17) % 97) / 100) * 0.98;
        const apexRatio = 0.05 + (((index * 29 + 11) % 48) / 100);
        const shape: ConfettiShape =
          index % 7 === 0 ? "cross" : index % 3 === 0 ? "round" : "rect";

        return {
          id: index,
          color: t.colors[COLOR_KEYS[index % COLOR_KEYS.length]],
          shape,
          startX: width * startRatio,
          startY: height * (0.82 + (index % 5) * 0.045),
          apexX: width * endRatio,
          apexY: height * apexRatio,
          landingX: width * Math.min(1.04, Math.max(-0.04, endRatio + ((index % 5) - 2) * 0.035)),
          landingY: height * Math.min(0.94, apexRatio + 0.34 + (index % 4) * 0.07),
          rotation: 220 + (index % 8) * 65,
          scale: 0.72 + (index % 4) * 0.16,
        };
      }),
    [height, t, width]
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
    if (reduceMotion !== false) return;

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 1450,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  if (reduceMotion !== false) return null;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.overlay}
    >
      {particles.map((particle) => {
        const translateX = progress.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [particle.startX, particle.apexX, particle.landingX],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [particle.startY, particle.apexY, particle.landingY],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${particle.rotation}deg`],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.05, 0.82, 1],
          outputRange: [0, 1, 0.96, 0],
        });

        const transform = [
          { translateX },
          { translateY },
          { rotate },
          { scale: particle.scale },
        ];

        if (particle.shape === "cross") {
          return (
            <Animated.View
              key={particle.id}
              style={[styles.cross, { opacity, transform }]}
            >
              <View style={[styles.crossBar, { backgroundColor: particle.color }]} />
              <View
                style={[
                  styles.crossBar,
                  styles.crossBarVertical,
                  { backgroundColor: particle.color },
                ]}
              />
            </Animated.View>
          );
        }

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              particle.shape === "round" ? styles.roundParticle : null,
              {
                backgroundColor: particle.color,
                opacity,
                transform,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
    left: -5,
    top: -9,
    width: 10,
    height: 20,
    borderRadius: 2,
  },
  roundParticle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cross: {
    position: "absolute",
    left: -10,
    top: -10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  crossBar: {
    position: "absolute",
    width: 20,
    height: 5,
    borderRadius: 2,
  },
  crossBarVertical: {
    transform: [{ rotate: "90deg" }],
  },
});
