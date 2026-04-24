import { LucideIconName } from "@/src/icons/lucide";
import { useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";

type ChatTopBarProps = {
  title?: string;
  onClose: () => void;
  topIcon?: LucideIconName;
  onTopIconPress?: () => void;
  topInset?: number;
  isSurfaceVisible?: boolean;
};

export default function ChatTopBar({
  title,
  onClose,
  topIcon,
  onTopIconPress,
  topInset = 0,
  isSurfaceVisible = false,
}: ChatTopBarProps) {
  const t = useTheme();
  const barHeight = 56;
  const s = useMemo(
    () => ({
      container: {
        height: barHeight + topInset,
        paddingTop: topInset,
        backgroundColor: isSurfaceVisible ? t.colors.background : "transparent",
      },
      bar: {
        height: barHeight,
        justifyContent: "center" as const,
      },
      titleWrap: {
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      leftIcon: {
        position: "absolute" as const,
        left: t.spacing.md,
      },
      closeIcon: {
        position: "absolute" as const,
        right: t.spacing.md,
      },
    }),
    [barHeight, isSurfaceVisible, t, topInset]
  );

  return (
    <View style={s.container}>
      <View style={s.bar}>
        {topIcon ? (
          <Pressable onPress={onTopIconPress} style={s.leftIcon} hitSlop={12}>
            <Icon name={topIcon} size={22} />
          </Pressable>
        ) : null}

        <View style={s.titleWrap}>
          <Text variant="subtitle">{title ?? ""}</Text>
        </View>

        <Pressable onPress={onClose} style={s.closeIcon} hitSlop={12}>
          <Icon name="x" size={32} />
        </Pressable>
      </View>
    </View>
  );
}
