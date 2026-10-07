import { Icon } from "@/src/components/Icon";
import type { ConversationView, ConversationViewAction } from "@/src/services/conversation.service";
import { useTheme } from "@/src/themes";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import ConversationStageCard from "./ConversationStageCard";

type Props = {
  view: ConversationView;
  disabled: boolean;
  loadingActionId: string | null;
  onPress: (action: ConversationViewAction) => void;
  expanded: boolean;
  onToggle: () => void;
  maxHeight: number;
  reduceMotion: boolean;
  onCompactLayout: (event: LayoutChangeEvent) => void;
};

export default function ConversationFloatingCard({
  view, disabled, loadingActionId, onPress, expanded, onToggle, maxHeight, reduceMotion, onCompactLayout,
}: Props) {
  const t = useTheme();
  const { fontScale } = useWindowDimensions();
  const opacity = useRef(new Animated.Value(1)).current;
  const actionCount = view.presentation?.locked ? 0 :
    view.actions.filter((action) => ["TOP", "AUX"].includes((action.ui_slot ?? "").toUpperCase())).length;
  const additionalActions = Math.max(0, actionCount - 1);
  const hasContent = Boolean(view.presentation || view.slots[0] || actionCount > 0);

  useEffect(() => {
    opacity.setValue(reduceMotion ? 1 : 0);
    if (reduceMotion) return;
    const animation = Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== "web" });
    animation.start();
    return () => animation.stop();
  }, [expanded, opacity, reduceMotion]);

  return (
    <View pointerEvents="box-none" style={{ backgroundColor: "transparent" }} onTouchStart={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      {...(Platform.OS === "web" ? { onWheel: (event: { stopPropagation: () => void }) => event.stopPropagation() } : {})}>
      <View onLayout={onCompactLayout} pointerEvents={expanded ? "none" : "auto"}
        accessibilityElementsHidden={expanded} importantForAccessibility={expanded ? "no-hide-descendants" : "auto"}
        style={{ marginHorizontal: t.spacing.sm, opacity: expanded ? 0 : 1 }}>
        <ConversationStageCard view={view} disabled={disabled || expanded} loadingActionId={loadingActionId}
          onPress={onPress} compact compactMaxHeight={maxHeight} />
      </View>
      {expanded && hasContent ? (
        <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, opacity, backgroundColor: "transparent" }}>
          <ScrollView style={{ maxHeight, backgroundColor: "transparent" }} keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator nestedScrollEnabled>
            <ConversationStageCard view={view} disabled={disabled} loadingActionId={loadingActionId}
              onPress={onPress} reserveCollapseControl />
          </ScrollView>
        </Animated.View>
      ) : null}
      {hasContent ? <Pressable onPress={onToggle} disabled={disabled} accessibilityRole="button"
        accessibilityLabel={`${expanded ? "Recoger" : "Expandir"} información de la compra`}
        accessibilityHint={!expanded && additionalActions > 0 ? `${additionalActions} opciones adicionales` : undefined}
        accessibilityState={{ expanded, disabled }}
        style={({ pressed }) => ({ position: "absolute", right: t.spacing.md + t.spacing.xs,
          top: !expanded && fontScale > 1.3 ? undefined : t.spacing.sm + t.spacing.xs,
          bottom: !expanded && fontScale > 1.3 ? t.spacing.sm + t.spacing.xs : undefined,
          width: 48, height: 48, alignItems: "center", justifyContent: "center",
          borderRadius: t.borders.md, borderWidth: expanded ? 0 : 1, borderColor: t.colors.border,
          backgroundColor: expanded ? "transparent" : t.colors.backgroudWhite,
          opacity: disabled ? 0.55 : pressed ? 0.72 : 1 })}>
        <Icon name={expanded ? "chevron-up" : "chevron-down"} size={expanded ? 18 : 22} />
      </Pressable> : null}
    </View>
  );
}
