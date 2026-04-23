import { Text } from "@/src/components/Text";
import { ConversationViewSlot } from "@/src/services/conversation.service";
import { useTheme } from "@/src/themes";
import { Asset } from "expo-asset";
import React, { useMemo, useState } from "react";
import { View } from "react-native";
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

export default function ConversationStatusSlotCard({ slot }: Props) {
  const t = useTheme();
  const [assetFailed, setAssetFailed] = useState(false);
  const deadlineBoxUri = useMemo(() => Asset.fromModule(deadlineBoxAsset).uri, []);
  const formattedDate = formatDeadlineDate(slot.due_at, slot.formatted_due_at);

  return (
    <View
      style={{
        alignSelf: "stretch",
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: 28,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.lg,
        backgroundColor: t.colors.backgroudWhite,
        gap: t.spacing.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.sm }}>
        {!assetFailed ? (
          <SvgUri
            uri={deadlineBoxUri}
            width={34}
            height={34}
            onError={() => setAssetFailed(true)}
          />
        ) : null}
        <View style={{ flexShrink: 1 }}>
          {slot.eyebrow_label ? (
            <Text variant="subtitle" color="stateAnulated">
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

      <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.sm }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
        <Text variant="subtitle" color="stateAnulated">
          {slot.section_label || "Información"}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
      </View>

      {slot.message ? (
        <Text
          variant="body"
          color="textDark"
          align="center"
          style={{ paddingHorizontal: t.spacing.sm }}
        >
          {slot.message}
        </Text>
      ) : null}

      {formattedDate ? (
        <Text
          variant="subtitle"
          color="textDark"
          align="center"
          style={{ paddingHorizontal: t.spacing.sm }}
        >
          {formattedDate}
        </Text>
      ) : null}
    </View>
  );
}
