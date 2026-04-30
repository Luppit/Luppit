import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import { createProductCardStyles } from "./styles";

type ProductCardProps = {
  title: string;
  subtitle: string;
  views: number;
  statusLabel?: string;
  offersLabel?: string;
  onPress?: () => void;
  onLongPress?: () => void;
};

export default function ProductCard({
  title,
  subtitle,
  views,
  statusLabel = "Activa",
  offersLabel = "# ofertas",
  onPress,
  onLongPress,
}: ProductCardProps) {
  const t = useTheme();
  const s = useMemo(() => createProductCardStyles(t), [t]);
  const liftScale = useRef(new Animated.Value(1)).current;
  const liftTranslateY = useRef(new Animated.Value(0)).current;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const settleCard = useCallback(() => {
    Animated.parallel([
      Animated.spring(liftScale, {
        toValue: 1,
        damping: 16,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
      Animated.spring(liftTranslateY, {
        toValue: 0,
        damping: 16,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [liftScale, liftTranslateY]);

  const liftCard = useCallback(() => {
    if (!onLongPress) return;
    didLongPressRef.current = false;
    liftScale.stopAnimation();
    liftTranslateY.stopAnimation();
    Animated.parallel([
      Animated.timing(liftScale, {
        toValue: 1.025,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(liftTranslateY, {
        toValue: -3,
        duration: 110,
        useNativeDriver: true,
      }),
    ]).start();
  }, [liftScale, liftTranslateY, onLongPress]);

  const handlePressOut = useCallback(() => {
    if (didLongPressRef.current) return;
    settleCard();
  }, [settleCard]);

  const handleLongPress = useCallback(() => {
    if (!onLongPress) return;
    didLongPressRef.current = true;

    longPressTimerRef.current = setTimeout(() => {
      onLongPress();
      settleCard();
    }, 80);
  }, [onLongPress, settleCard]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: liftTranslateY }, { scale: liftScale }],
      }}
    >
      <Pressable
        style={s.wrapper}
        onPress={onPress}
        onPressIn={liftCard}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        disabled={!onPress && !onLongPress}
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
    </Animated.View>
  );
}
