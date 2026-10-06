import { Icon } from "@/src/components/Icon";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { Text } from "@/src/components/Text";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import type {
  ConversationView,
  ConversationViewAction,
  ConversationViewSlot,
} from "@/src/services/conversation.service";
import { useTheme } from "@/src/themes";
import React from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import ConversationActionButtons from "./ConversationActionButtons";
import { normalizeOptionalIcon, normalizeStyleFlags, toTopButtonConfig } from "./useConversationActions";

type Props = {
  view: ConversationView;
  disabled: boolean;
  loadingActionId?: string | null;
  onPress: (action: ConversationViewAction) => void;
  onCardLayout?: (event: LayoutChangeEvent) => void;
  compact?: boolean;
  reserveCollapseControl?: boolean;
  compactMaxHeight?: number;
};

function formatDeadline(slot: ConversationViewSlot) {
  if (slot.formatted_due_at?.trim()) return slot.formatted_due_at;
  if (!slot.due_at) return null;
  const date = new Date(slot.due_at);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("es-CR");
}

export default function ConversationStageCard({
  view,
  disabled,
  loadingActionId,
  onPress,
  onCardLayout,
  compact = false,
  reserveCollapseControl = false,
  compactMaxHeight,
}: Props) {
  const t = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const [compactActionHeight, setCompactActionHeight] = React.useState(
    fontScale > 1.3 ? t.typography.body.lineHeight * Math.min(fontScale, 2) * 2 + t.spacing.sm * 2 + 2 : 48,
  );
  const stackComparison = width < 360 || fontScale > 1.3;
  const presentation = view.presentation;
  const fallbackSlot = view.slots[0];
  const actions = presentation?.locked ? [] : view.actions.filter((action) =>
    ["TOP", "AUX"].includes((action.ui_slot ?? "").toUpperCase())
  );
  const card = presentation?.card ?? {
    label: fallbackSlot?.eyebrow_label ?? "Estado actual",
    title: fallbackSlot?.title ?? "Conversación",
    message: fallbackSlot?.message ?? "",
    icon: fallbackSlot?.icon ?? null,
    tone: "normal",
    comparison: undefined,
    supporting: undefined,
  };
  const cardIcon = normalizeOptionalIcon(card.icon);
  const accentColor = card.tone === "danger"
    ? t.colors.error
    : card.tone === "success" ? t.colors.success : t.colors.primary;
  const surface = {
    ...createRoundedSurfaceStyle(t),
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    gap: t.spacing.md,
  };
  const deadlines = view.slots.flatMap((slot) => {
    const date = formatDeadline(slot);
    return date || slot.availability || slot.deadline_message ? [{ slot, date }] : [];
  });

  if (!presentation && !fallbackSlot && actions.length === 0) return null;

  if (compact) {
    const compactAction = actions.find((action) => {
      const { isPrimary, isDanger } = normalizeStyleFlags(action.style_code);
      return isPrimary && !isDanger;
    }) ?? actions.find((action) => !normalizeStyleFlags(action.style_code).isDanger);
    const deadline = deadlines.find(({ date }) => date);
    const hint = card.supporting?.title || (deadline
      ? `${deadline.slot.section_label || (deadline.slot.is_overdue ? "Plazo vencido" : "Plazo")}: ${deadline.date}`
      : presentation?.rating_message);
    const hintContent = hint ? (
      <Text variant="small" color={deadline?.slot.is_overdue ? "error" : "textMedium"}
        maxFontSizeMultiplier={2}>{hint}</Text>
    ) : null;
    return (
      <GlassSurface variant="chrome" style={{ borderRadius: t.glass.radius.surface }}
        clipStyle={{ borderRadius: t.glass.radius.surface }}
        contentStyle={{ padding: t.spacing.sm + t.spacing.xs, gap: t.spacing.sm }}>
        <View onLayout={(event) => setCompactActionHeight(event.nativeEvent.layout.height)}
          style={{ flexDirection: fontScale > 1.3 ? "column" : "row", gap: t.spacing.sm }}>
          <View style={{ flex: fontScale > 1.3 ? undefined : 1, minWidth: 0 }}>
            {compactAction ? (
              <ConversationActionButtons buttons={[toTopButtonConfig(compactAction)]}
                disabled={disabled} loadingButtonId={loadingActionId}
                onPress={() => onPress(compactAction)} />
            ) : (
              <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: t.spacing.sm }}>
                {cardIcon ? <Icon name={cardIcon} size={22} color={accentColor} /> : null}
                <Text variant="body" maxFontSizeMultiplier={2} style={{ flex: 1 }}>{card.title}</Text>
              </View>
            )}
          </View>
          {fontScale <= 1.3 ? <View style={{ width: 48 }} /> : null}
        </View>
        {hint || fontScale > 1.3 ? (
          <View style={{ minHeight: fontScale > 1.3 ? 48 : undefined,
            paddingRight: fontScale > 1.3 ? 48 + t.spacing.sm : 0, justifyContent: "center" }}>
            {hintContent && compactMaxHeight != null ? (
              <ScrollView style={{ maxHeight: Math.max(48, compactMaxHeight - compactActionHeight -
                (t.spacing.sm + t.spacing.xs) * 2 - t.spacing.sm - 2) }} nestedScrollEnabled
                keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                {hintContent}
              </ScrollView>
            ) : hintContent}
          </View>
        ) : null}
      </GlassSurface>
    );
  }

  return (
    <View style={{ gap: t.spacing.md }}>
      {presentation?.request_brief ? (
        <View style={surface}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.sm }}>
            <Icon name="file-text" size={20} color={t.colors.textMedium} />
            <Text variant="small" color="textMedium" style={{ flex: 1, paddingRight: reserveCollapseControl ? 48 : 0 }}>
              {presentation.request_brief.label}
            </Text>
          </View>
          <Text variant="body" maxFontSizeMultiplier={2}>
            {presentation.request_brief.description}
          </Text>
        </View>
      ) : null}

      <View style={surface} onLayout={onCardLayout}>
        {card.label ? <Text variant="small" color="textMedium"
          style={reserveCollapseControl ? { paddingRight: 48 } : undefined}>{card.label}</Text>
          : reserveCollapseControl ? <View style={{ height: t.spacing.lg }} /> : null}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: t.spacing.sm }}>
          {cardIcon ? <Icon name={cardIcon} size={26} color={accentColor} /> : null}
          <View style={{ flex: 1, gap: t.spacing.sm }}>
            {card.title ? (
              <Text variant="subtitle" accessibilityRole="header" maxFontSizeMultiplier={2}>
                {card.title}
              </Text>
            ) : null}
            {card.message ? (
              <Text variant="body" color="textMedium" maxFontSizeMultiplier={2}>
                {card.message}
              </Text>
            ) : null}
          </View>
        </View>

        {card.comparison ? (
          <View style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: t.colors.border,
            paddingTop: t.spacing.md,
            flexDirection: stackComparison ? "column" : "row",
            gap: t.spacing.md,
          }}>
            <View style={{ flex: stackComparison ? undefined : 1, gap: t.spacing.xs }} accessible
              accessibilityLabel={`${card.comparison.current_label}: ${card.comparison.current_value}`}>
              <Text variant="small" color="textMedium">{card.comparison.current_label}</Text>
              <Text variant="subtitle" maxFontSizeMultiplier={2}>{card.comparison.current_value}</Text>
            </View>
            <View style={{ flex: stackComparison ? undefined : 1, gap: t.spacing.xs }} accessible
              accessibilityLabel={`${card.comparison.proposed_label}: ${card.comparison.proposed_value}`}>
              <Text variant="small" color="textMedium">{card.comparison.proposed_label}</Text>
              <Text variant="subtitle" color="primary" maxFontSizeMultiplier={2}>{card.comparison.proposed_value}</Text>
            </View>
          </View>
        ) : null}

        {card.supporting ? (
          <View style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: t.colors.border,
            paddingTop: t.spacing.md,
            gap: t.spacing.sm,
          }}>
            <Text variant="body" maxFontSizeMultiplier={2}>{card.supporting.title}</Text>
            <Text variant="body" color="textMedium" maxFontSizeMultiplier={2}>{card.supporting.message}</Text>
          </View>
        ) : null}

        {deadlines.map(({ slot, date }, index) => (
          <View key={`${slot.code}-${index}`} style={{ gap: t.spacing.md }}>
            {slot.availability ? (
              <View style={{ gap: t.spacing.xs }} accessible
                accessibilityLabel={`${slot.availability.label}: ${slot.availability.formatted_at}`}>
                <Text variant="small" color="textMedium">{slot.availability.label}</Text>
                <Text variant="body" maxFontSizeMultiplier={2}>{slot.availability.formatted_at}</Text>
              </View>
            ) : null}
            {date ? (
              <View style={{ gap: t.spacing.xs }} accessible
                accessibilityLabel={`${slot.section_label || (slot.is_overdue ? "Plazo vencido" : "Plazo")}: ${date}`}>
                <Text variant="small" color={slot.is_overdue ? "error" : "textMedium"}>
                  {slot.section_label || (slot.is_overdue ? "Plazo vencido" : "Plazo")}
                </Text>
                <Text variant="body" color={slot.is_overdue ? "error" : "textDark"} maxFontSizeMultiplier={2}>
                  {date}
                </Text>
              </View>
            ) : null}
            {slot.deadline_message ? (
              <Text variant="small" color="textMedium" maxFontSizeMultiplier={2}>
                {slot.deadline_message}
              </Text>
            ) : null}
          </View>
        ))}

        <ConversationActionButtons
          buttons={actions.map(toTopButtonConfig)}
          disabled={disabled}
          loadingButtonId={loadingActionId}
          onPress={(id) => {
            const action = actions.find((item) => item.id === id);
            if (action) onPress(action);
          }}
        />
        {presentation?.rating_message ? (
          <Text variant="small" color="textMedium" maxFontSizeMultiplier={2}>
            {presentation.rating_message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
