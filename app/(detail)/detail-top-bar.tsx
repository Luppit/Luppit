import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

type DetailTopBarProps = {
  title?: string;
};

export default function DetailTopBar({ title }: DetailTopBarProps) {
  const t = useTheme();

  return (
    <View
      style={{
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: t.colors.background,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{ width: 40, alignItems: "flex-start" }}
      >
        <Icon name="arrow-left" size={28} />
      </Pressable>

      <Text variant="subtitle" align="center" maxLines={1} style={{ flex: 1 }}>
        {title ?? ""}
      </Text>

      <Pressable
        onPress={() => console.log("detail top action")}
        hitSlop={12}
        style={{ width: 40, alignItems: "flex-end" }}
      >
        <Icon name="ellipsis" size={28} />
      </Pressable>
    </View>
  );
}
