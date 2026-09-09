import { Text } from "@/src/components/Text";
import type { OfferRequestReference as RequestReference } from "@/src/services/purchase.offer.reference.service";
import { useTheme } from "@/src/themes";
import React from "react";
import { View } from "react-native";

export default function OfferRequestReference({ reference }: { reference: RequestReference }) {
  const t = useTheme();

  return (
    <View style={{ alignSelf: "stretch", gap: t.spacing.xs }}>
      <Text variant="small" color="textMedium" accessibilityRole="header">
        Solicitud del comprador
      </Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: t.borders.md,
          backgroundColor: t.colors.backgroudWhite,
          padding: t.spacing.md,
          gap: t.spacing.sm,
        }}
      >
        <Text variant="small" color="textMedium">
          {reference.source === "conversation" ? "Referencia de la conversación" : "Referencia actual de la solicitud"}
        </Text>
        <Text variant="body" selectable>
          {reference.text ?? "Esta solicitud no tiene título ni resumen disponibles."}
        </Text>
      </View>
    </View>
  );
}
