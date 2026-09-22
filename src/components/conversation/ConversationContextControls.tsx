import GlassSurface from "@/src/components/glass/GlassSurface";
import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

type ContextAction = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  price?: string | null;
  primary?: ContextAction & { busy?: boolean };
  secondary?: ContextAction & {
    icon?: React.ComponentProps<typeof Icon>["name"];
    expanded?: boolean;
    triggerRef?: React.Ref<View>;
  };
};

export default function ConversationContextControls({ price, primary, secondary }: Props) {
  const t = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stack = fontScale > 1.3 || width < 360 || (price?.length ?? 0) > 12;
  const pillStyle = { borderRadius: t.glass.radius.chip };
  const controlPadding = {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  };

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.spacing.sm }}>
      {primary ? (
        <GlassSurface
          variant="control"
          style={[pillStyle, { flexGrow: secondary ? 1 : 0, flexBasis: stack ? "100%" : secondary ? 0 : "auto" }]}
          clipStyle={pillStyle}
          contentStyle={{ flexDirection: "row", alignItems: "center" }}
        >
          {price ? (
            <>
              <Text variant="body" accessibilityLabel={`Total de productos: ${price}`}
                style={{ flex: secondary || stack ? 1 : undefined, paddingHorizontal: t.spacing.md, fontFamily: t.typography.subtitle.fontFamily }}>
                {price}
              </Text>
              <View style={{ width: StyleSheet.hairlineWidth, height: 24, backgroundColor: t.colors.border }} />
            </>
          ) : null}
          <Pressable
            onPress={primary.onPress}
            disabled={primary.busy || primary.disabled}
            accessibilityRole="button"
            accessibilityLabel={primary.accessibilityLabel}
            accessibilityState={{ busy: primary.busy, disabled: primary.busy || primary.disabled }}
            style={({ pressed }) => [controlPadding, { minHeight: 48, justifyContent: "center", opacity: pressed || primary.disabled ? 0.6 : 1 }]}
          >
            <Text variant="body" style={{ opacity: primary.busy ? 0 : 1 }}>{primary.label}</Text>
            {primary.busy ? <ActivityIndicator size="small" color={t.colors.textDark} style={{ position: "absolute", alignSelf: "center" }} /> : null}
          </Pressable>
        </GlassSurface>
      ) : null}
      {secondary ? (
        <GlassSurface variant="control" style={pillStyle} clipStyle={pillStyle}>
          <Pressable
            ref={secondary.triggerRef}
            onPress={secondary.onPress}
            disabled={secondary.disabled}
            accessibilityRole="button"
            accessibilityLabel={secondary.accessibilityLabel}
            accessibilityState={{ expanded: secondary.expanded, disabled: secondary.disabled }}
            style={({ pressed }) => [controlPadding, { minHeight: 48, flexDirection: "row", alignItems: "center", gap: t.spacing.sm, opacity: pressed || secondary.disabled ? 0.6 : 1 }]}
          >
            <Text variant="body">{secondary.label}</Text>
            {secondary.icon ? <Icon name={secondary.icon} size={18} /> : null}
          </Pressable>
        </GlassSurface>
      ) : null}
    </View>
  );
}
