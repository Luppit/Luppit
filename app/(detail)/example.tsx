import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

export default function DetailExampleScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT + t.spacing.md,
      }}
    >
      <Text variant="body">
        Compresor del aire acondicionado para Nissan Sentra 2023, motor
        gasolina, original y solo la pieza principal.
      </Text>
    </View>
  );
}
