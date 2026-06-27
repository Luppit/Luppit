import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { useTheme } from "@/src/themes";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, View } from "react-native";

type ModalTopBarProps = {
  title?: string;
  glass?: boolean;
  topInset?: number;
};

export const MODAL_TOP_BAR_HEIGHT = 56;

export default function ModalTopBar({
  title,
  glass = false,
  topInset = 0,
}: ModalTopBarProps) {
  const t = useTheme();
  const content = (
    <View
      style={{
        height: MODAL_TOP_BAR_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: glass ? t.spacing.xl : 0,
      }}
    >
      <View style={{ width: 40 }} />

      <Text variant="subtitle" align="center" maxLines={1} style={{ flex: 1 }}>
        {title ?? ""}
      </Text>

      {glass ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ width: 40, alignItems: "flex-end", justifyContent: "center" }}
        >
          <Icon name="x" size={32} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ width: 40, alignItems: "flex-end" }}
        >
          <Icon name="x" size={32} />
        </Pressable>
      )}
    </View>
  );

  if (glass) {
    return (
      <GlassSurface
        variant="chrome"
        blur="chrome"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          height: MODAL_TOP_BAR_HEIGHT + topInset,
          paddingTop: topInset,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: t.glass.radius.chrome,
          borderBottomRightRadius: t.glass.radius.chrome,
          elevation: Platform.OS === "android" ? 4 : 10,
        }}
        clipStyle={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: t.glass.radius.chrome,
          borderBottomRightRadius: t.glass.radius.chrome,
          overflow: "hidden",
        }}
      >
        {content}
      </GlassSurface>
    );
  }

  return (
    <View
      style={{
        height: MODAL_TOP_BAR_HEIGHT,
        backgroundColor: t.colors.background,
      }}
    >
      {content}
    </View>
  );
}
