import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native";

type LoadingStateProps = {
  label?: string;
  variant?: "screen" | "inline";
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const LOADING_DIM_BACKDROP = "rgba(0,0,0,0.34)";

export default function LoadingState({
  label = "Cargando...",
  variant = "screen",
  dimmed = false,
  style,
}: LoadingStateProps) {
  const t = useTheme();
  const isScreen = variant === "screen";
  const textColor = dimmed ? "backgroudWhite" : "stateAnulated";

  return (
    <View
      accessibilityRole="progressbar"
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          gap: t.spacing.sm,
          paddingHorizontal: t.spacing.lg,
          paddingVertical: isScreen ? t.spacing.xl : t.spacing.lg,
          backgroundColor: dimmed ? LOADING_DIM_BACKDROP : "transparent",
        },
        isScreen ? { flex: 1 } : null,
        style,
      ]}
    >
      <ActivityIndicator color={dimmed ? t.colors.backgroudWhite : t.colors.primary} />
      <Text color={textColor} align="center">
        {label}
      </Text>
    </View>
  );
}
