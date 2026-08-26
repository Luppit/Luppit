import { useTheme, Theme } from "@/src/themes";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  useColorScheme,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";

type GlassVariant = "surface" | "chrome" | "sheet" | "chip" | "control" | "nav";
type GlassBlur = keyof Theme["glass"]["blurIntensity"];

type GlassSurfaceProps = ViewProps & {
  variant?: GlassVariant;
  blur?: GlassBlur | false;
  clipStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export default function GlassSurface({
  variant = "surface",
  blur,
  style,
  clipStyle,
  contentStyle,
  children,
  ...viewProps
}: GlassSurfaceProps) {
  const t = useTheme();
  const colorScheme = useColorScheme();
  const variantStyle = t.glass[variant];
  const radius = t.glass.radius[variant];
  const blurKey = blur === false ? null : blur ?? (variant === "chip" ? "surface" : variant);
  const shouldUseLayeredMaterial = Boolean(blurKey) && Platform.OS !== "android";
  const layeredBlurKey = shouldUseLayeredMaterial ? blurKey : null;
  const tintStyle =
    typeof variantStyle.backgroundColor === "string"
      ? { backgroundColor: variantStyle.backgroundColor }
      : null;

  return (
    <View
      {...viewProps}
      style={[
        variantStyle,
        shouldUseLayeredMaterial ? { backgroundColor: "transparent" } : null,
        { borderRadius: radius, borderCurve: "continuous" },
        style,
      ]}
    >
      {layeredBlurKey ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: radius,
              borderCurve: "continuous",
              overflow: "hidden",
            },
            clipStyle,
          ]}
        >
          <BlurView
            intensity={t.glass.blurIntensity[layeredBlurKey]}
            tint={
              colorScheme === "dark"
                ? "systemUltraThinMaterialDark"
                : t.glass.blurTint[layeredBlurKey]
            }
            style={StyleSheet.absoluteFillObject}
          />
          {tintStyle ? <View style={[StyleSheet.absoluteFillObject, tintStyle]} /> : null}
        </View>
      ) : null}

      <View style={contentStyle}>{children}</View>
    </View>
  );
}
