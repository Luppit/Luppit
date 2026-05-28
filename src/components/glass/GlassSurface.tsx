import { useTheme, Theme } from "@/src/themes";
import { BlurView } from "expo-blur";
import React from "react";
import {
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
  highlight?: boolean;
  clipStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  highlightStyle?: StyleProp<ViewStyle>;
};

export default function GlassSurface({
  variant = "surface",
  blur,
  highlight = false,
  style,
  clipStyle,
  contentStyle,
  highlightStyle,
  children,
  ...viewProps
}: GlassSurfaceProps) {
  const t = useTheme();
  const colorScheme = useColorScheme();
  const variantStyle = t.glass[variant];
  const radius = t.glass.radius[variant];
  const blurKey = blur === false ? null : blur ?? (variant === "chip" ? "surface" : variant);
  const tintStyle =
    typeof variantStyle.backgroundColor === "string"
      ? { backgroundColor: variantStyle.backgroundColor }
      : null;

  return (
    <View
      {...viewProps}
      style={[
        variantStyle,
        blurKey ? { backgroundColor: "transparent" } : null,
        { borderRadius: radius },
        style,
      ]}
    >
      {blurKey ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius: radius, overflow: "hidden" },
            clipStyle,
          ]}
        >
          <BlurView
            intensity={t.glass.blurIntensity[blurKey]}
            tint={
              colorScheme === "dark"
                ? "systemUltraThinMaterialDark"
                : t.glass.blurTint[blurKey]
            }
            style={StyleSheet.absoluteFillObject}
          />
          {tintStyle ? <View style={[StyleSheet.absoluteFillObject, tintStyle]} /> : null}
        </View>
      ) : null}

      {highlight ? (
        <View pointerEvents="none" style={[t.glass.topHighlight, highlightStyle]} />
      ) : null}

      <View style={contentStyle}>{children}</View>
    </View>
  );
}
