import { LucideIconName } from "@/src/icons/lucide";
import GlassSurface from "@/src/components/glass/GlassSurface";
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

export const CHAT_TOP_BAR_VISIBLE_HEIGHT = 56;

export default function ChatTopBar({
  title,
  onClose,
  topIcon,
  onTopIconPress,
  topInset = 0,
  isSurfaceVisible = false,
}: ChatTopBarProps) {
  const t = useTheme();
  const s = useMemo(
    () => ({
      container: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        elevation: 10,
        height: CHAT_TOP_BAR_VISIBLE_HEIGHT + topInset,
        paddingTop: topInset,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: t.glass.radius.chrome,
        borderBottomRightRadius: t.glass.radius.chrome,
      },
      clip: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: t.glass.radius.chrome,
        borderBottomRightRadius: t.glass.radius.chrome,
        overflow: "hidden" as const,
      },
      bar: {
        height: CHAT_TOP_BAR_VISIBLE_HEIGHT,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        paddingHorizontal: t.spacing.xl,
      },
      titleWrap: {
        flex: 1,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      iconSlot: {
        width: 40,
        justifyContent: "center" as const,
      },
    }),
    [t, topInset]
  );

  const content = (
    <View style={s.bar}>
      {topIcon ? (
        <Pressable
          onPress={onTopIconPress}
          style={[s.iconSlot, { alignItems: "flex-start" }]}
          hitSlop={12}
        >
          <Icon name={topIcon} size={22} />
        </Pressable>
      ) : (
        <View style={s.iconSlot} />
      )}

      <View style={s.titleWrap}>
        <Text variant="subtitle" align="center" maxLines={1}>
          {title ?? ""}
        </Text>
      </View>

      <Pressable
        onPress={onClose}
        style={[s.iconSlot, { alignItems: "flex-end" }]}
        hitSlop={12}
      >
        <Icon name="x" size={32} />
      </Pressable>
    </View>
  );

  if (!isSurfaceVisible) {
    return <View style={s.container}>{content}</View>;
  }

  return (
    <GlassSurface
      variant="chrome"
      blur="chrome"
      style={s.container}
      clipStyle={s.clip}
    >
      {content}
    </GlassSurface>
  );
}
