import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { View } from "react-native";
import { createStatusChipStyles } from "./styles";

type StatusChipProps = {
  label: string;
};

export default function StatusChip({ label }: StatusChipProps) {
  const t = useTheme();
  const s = useMemo(() => createStatusChipStyles(t), [t]);

  return (
    <View style={s.container}>
      <View style={s.dot} />
      <Text variant="body" maxLines={1} style={s.label}>
        {label}
      </Text>
    </View>
  );
}
