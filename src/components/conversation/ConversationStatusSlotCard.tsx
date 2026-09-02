import { BundledSvg } from "@/src/components/BundledSvg";
import { Text } from "@/src/components/Text";
import { Icon } from "@/src/components/Icon";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { lucideIcons, type LucideIconName } from "@/src/icons/lucide";
import { ConversationViewSlot } from "@/src/services/conversation.service";
import { Theme, useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  slot: ConversationViewSlot;
};

const deadlineBoxAsset = require("../../../assets/images/deadline-box.svg");

function formatDeadlineDate(date: string | null, formattedDate: string | null) {
  if (formattedDate?.trim()) return formattedDate;
  if (!date) return null;

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const dayText = new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(parsedDate)
    .replace(",", "");

  const timeText = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(parsedDate)
    .replace(/\s/g, "")
    .toLowerCase();

  return `El ${dayText} a las ${timeText}`;
}

function getDeadlineCaption(slot: ConversationViewSlot) {
  if (slot.is_overdue) return "Este plazo ya venció:";
  if (slot.trigger_transition_to?.startsWith("DELAYED_")) {
    return "Se marcará con atraso después de esta fecha:";
  }
  return "Fecha límite:";
}

export default function ConversationStatusSlotCard({ slot }: Props) {
  const t = useTheme();
  const s = useMemo(() => createStyles(t), [t]);
  const formattedDate = formatDeadlineDate(slot.due_at, slot.formatted_due_at);
  const deadlineCaption = getDeadlineCaption(slot);
  const statusIcon =
    slot.icon && slot.icon in lucideIcons ? (slot.icon as LucideIconName) : null;

  return (
    <View style={s.card}>
      <View style={s.header}>
        {statusIcon ? (
          <View style={s.iconBadge}>
            <Icon name={statusIcon} size={22} color={t.colors.primary} />
          </View>
        ) : (
          <BundledSvg asset={deadlineBoxAsset} width={34} height={34} />
        )}
        <View style={s.headerCopy}>
          {slot.eyebrow_label ? (
            <Text variant="small" color="textMedium" style={s.eyebrow}>
              {slot.eyebrow_label}
            </Text>
          ) : null}
          {slot.title ? (
            <Text variant="subtitle" color="textDark">
              {slot.title}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={s.sectionHeader}>
        <View style={s.divider} />
        <Text variant="small" color="textMedium">
          {slot.section_label || "Información"}
        </Text>
        <View style={s.divider} />
      </View>

      {slot.message ? (
        <Text variant="body" color="textDark" align="center" style={s.message}>
          {slot.message}
        </Text>
      ) : null}

      {formattedDate ? (
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${deadlineCaption} ${formattedDate}`}
          style={s.deadline}
        >
          <Text variant="small" color="textMedium" align="center">
            {deadlineCaption}
          </Text>
          <Text variant="body" color="textDark" align="center" style={s.deadlineDate}>
            {formattedDate}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    card: {
      alignSelf: "stretch",
      borderWidth: 1,
      borderColor: t.colors.border,
      ...createRoundedSurfaceStyle(t),
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.lg,
      gap: t.spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    headerCopy: {
      flex: 1,
      flexShrink: 1,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.backgroudWhite,
    },
    eyebrow: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    divider: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.colors.border,
    },
    message: {
      paddingHorizontal: t.spacing.sm,
    },
    deadline: {
      alignItems: "center",
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.sm,
    },
    deadlineDate: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
  });
}
