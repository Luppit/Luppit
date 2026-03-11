import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { View } from "react-native";

export default function DetailExampleScreen() {
  const t = useTheme();

  return (
    <View style={{ flex: 1, paddingTop: t.spacing.md }}>
      <Text variant="body">
        Compresor del aire acondicionado para Nissan Sentra 2023, motor
        gasolina, original y solo la pieza principal.
      </Text>
    </View>
  );
}
