import { GroupedListRow } from "@/src/components/groupedList/GroupedList";
import {
  getSupportEmail,
  openSupportEmail,
} from "@/src/services/support.service";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";

type SupportContactRowProps = {
  showSeparator?: boolean;
};

export function SupportContactRow({
  showSeparator = false,
}: SupportContactRowProps) {
  const [supportEmail, setSupportEmail] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setIsLoading(true);

      void getSupportEmail().then((result) => {
        if (!active) return;
        setSupportEmail(result.ok ? result.data : null);
        setIsLoading(false);
      });

      return () => {
        active = false;
      };
    }, [])
  );

  const description = isLoading
    ? "Cargando correo de soporte…"
    : supportEmail
      ? `Escríbenos a ${supportEmail}.`
      : "Soporte no disponible temporalmente.";

  return (
    <GroupedListRow
      icon="life-buoy"
      label="Contactar soporte"
      description={description}
      showSeparator={showSeparator}
      accessibilityLabel="Enviar correo a soporte"
      onPress={
        supportEmail ? () => void openSupportEmail(supportEmail) : undefined
      }
    />
  );
}
