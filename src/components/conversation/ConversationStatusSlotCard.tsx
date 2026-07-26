import { Text } from "@/src/components/Text";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { ConversationViewSlot } from "@/src/services/conversation.service";
import { Theme, useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SvgUri } from "react-native-svg";

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
  const [assetFailed, setAssetFailed] = useState(false);
  const deadlineBoxUri = useMemo(() => Asset.fromModule(deadlineBoxAsset).uri, []);
  const formattedDate = formatDeadlineDate(slot.due_at, slot.formatted_due_at);
  const deadlineCaption = getDeadlineCaption(slot);

  return (
    <View style={s.card}>
      <View style={s.header}>
        {!assetFailed ? (
          <SvgUri
            uri={deadlineBoxUri}
            width={34}
            height={34}
            onError={() => setAssetFailed(true)}
          />
        ) : null}
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
      flexShrink: 1,
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
