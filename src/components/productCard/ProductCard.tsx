import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { createProductCardStyles } from "./styles";

type ProductCardProps = {
  title: string;
  subtitle: string;
  views: number;
  statusLabel?: string;
  offersLabel?: string;
  onPress?: () => void;
};

export default function ProductCard({
  title,
  subtitle,
  views,
  statusLabel = "Activa",
  offersLabel = "# ofertas",
  onPress,
}: ProductCardProps) {
  const t = useTheme();
  const s = useMemo(() => createProductCardStyles(t), [t]);

  return (
    <Pressable
      style={s.wrapper}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
    >
      <View style={s.card}>
        <View>
          <Text variant="subtitle" maxLines={1} style={s.title}>
            {title}
          </Text>
          <Text variant="body" maxLines={1} style={s.subtitle}>
            {subtitle}
          </Text>
        </View>

        <View style={s.bottomRow}>
          <View style={s.viewsRow}>
            <Icon name="eye" size={26} color={t.colors.stateAnulated} />
            <Text variant="body" style={s.viewsText}>
              {views}
            </Text>
          </View>

          <View style={s.statusPill}>
            <Text variant="body" style={s.statusText}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <Text variant="body" style={s.offersText}>
        {offersLabel}
      </Text>
    </Pressable>
  );
}
