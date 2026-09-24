import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import type { OfferRequestReference as RequestReference } from "@/src/services/purchase.offer.reference.service";
import { useTheme } from "@/src/themes";
import React from "react";
import { Pressable, View } from "react-native";

export default function OfferRequestReference({ reference }: { reference: RequestReference }) {
  const t = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  return (
    <View style={{ alignSelf: "stretch", gap: t.spacing.xs }}>
      <Text variant="small" color="textMedium" accessibilityRole="header">
        Solicitud del comprador
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Ocultar detalles de la solicitud" : "Ver detalles de la solicitud"}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={{
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: t.borders.md,
          backgroundColor: t.colors.backgroudWhite,
          padding: t.spacing.md,
          gap: t.spacing.sm,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.sm }}>
          <Text variant="body" style={{ flex: 1 }} numberOfLines={expanded ? undefined : 2}>
            {reference.title?.trim() || "Solicitud del comprador"}
          </Text>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={20} color={t.colors.textMedium} />
        </View>
        {expanded ? (
          <View style={{ gap: t.spacing.xs }}>
            <Text variant="small" color="textMedium">
              {reference.source === "conversation" ? "Referencia de la conversación" : "Referencia actual de la solicitud"}
            </Text>
            <Text variant="body" selectable>
              {reference.text ?? "Esta solicitud no tiene título ni resumen disponibles."}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
