import { GroupedListRow, GroupedListSection } from "@/src/components/groupedList/GroupedList";
import { Text } from "@/src/components/Text";
import { getBusinessVerificationReviewEstimate } from "@/src/services/business-verification.service";
import { useTheme } from "@/src/themes";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

export default function SellerSetupOverview() {
  const t = useTheme();
  const [reviewEstimate, setReviewEstimate] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getBusinessVerificationReviewEstimate().then((result) => {
      if (active) setReviewEstimate(result.ok ? result.data : null);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <View style={{ gap: t.spacing.md }}>
      <Text color="textMedium">
        Revisá solicitudes de compra y elegí en cuáles ofrecer.
      </Text>
      <GroupedListSection title="Cómo empezar a ofrecer">
        <GroupedListRow
          icon="file-text"
          label="Correo y documentos"
          description="Verificá tu correo y adjuntá documentos que acrediten el negocio y tu relación con él."
          descriptionMaxLines={6}
          showChevron={false}
        />
        <GroupedListRow
          icon="clock"
          label="Revisión del negocio"
          description={reviewEstimate
            ? `Tiempo estimado: ${reviewEstimate}. Te avisamos por correo y en la app.`
            : "Nuestro equipo revisa los documentos antes de habilitar el negocio. Te avisamos por correo y en la app."}
          descriptionMaxLines={6}
          showChevron={false}
        />
        <GroupedListRow
          icon="store"
          label="Prepará tu negocio"
          description="Guardá tus categorías, distrito y foto mientras revisamos los documentos. Cuando tu negocio esté aprobado y configurado, podés revisar solicitudes y hacer ofertas."
          descriptionMaxLines={6}
          showChevron={false}
          showSeparator={false}
        />
      </GroupedListSection>
    </View>
  );
}
