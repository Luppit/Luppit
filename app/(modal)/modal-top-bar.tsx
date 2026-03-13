import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

type ModalTopBarProps = {
  title?: string;
};

export default function ModalTopBar({ title }: ModalTopBarProps) {
  const t = useTheme();

  return (
    <View
      style={{
        height: 68,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: t.colors.backgroudWhite,
      }}
    >
      <View style={{ width: 40 }} />

      <Text variant="subtitle" align="center" maxLines={1} style={{ flex: 1 }}>
        {title ?? ""}
      </Text>

      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{ width: 40, alignItems: "flex-end" }}
      >
        <Icon name="x" size={32} />
      </Pressable>
    </View>
  );
}
