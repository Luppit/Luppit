import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import LoadingState from "@/src/components/loading/LoadingState";
import StandaloneListEmptyState from "@/src/components/standaloneList/StandaloneListEmptyState";
import { openPopup } from "@/src/services/popup.service";
import {
  getCurrentSafetyBlocks,
  SafetyBlockListItem,
  unblockSafetyBlock,
} from "@/src/services/safety.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

function formatBlockedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `Bloqueado el ${date.toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

export default function BlockedAccountsScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(t, insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT, insets.bottom),
    [insets.bottom, insets.top, t]
  );
  const [blocks, setBlocks] = useState<SafetyBlockListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await getCurrentSafetyBlocks();
    if (!result.ok) {
      setBlocks([]);
      setIsLoading(false);
      showError("No se pudieron cargar los bloqueos", result.error.message);
      return;
    }
    setBlocks(result.data);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {};
    }, [load])
  );

  const openUnblockConfirmation = (block: SafetyBlockListItem) => {
    openPopup({
      type: "summary",
      title: `Desbloquear a ${block.counterpartLabel}`,
      icon: "shield-check",
      description:
        "Podrán volver a encontrarse y comunicarse cuando el estado de una conversación lo permita.",
      actions: [
        {
          id: "keep-blocked",
          label: "Volver",
          icon: "arrow-left",
        },
        {
          id: "unblock",
          label: "Desbloquear",
          icon: "shield-check",
          backgroundColorKey: "primary",
          textColorKey: "backgroudWhite",
          iconColorKey: "backgroudWhite",
          onPress: async () => {
            const result = await unblockSafetyBlock(block.id);
            if (!result.ok) {
              showError("No se pudo desbloquear", result.error.message);
              return false;
            }
            setBlocks((current) => current.filter((item) => item.id !== block.id));
            showSuccess("Contacto desbloqueado");
            return true;
          },
        },
      ],
    });
  };

  if (isLoading) {
    return <LoadingState label="Cargando cuentas bloqueadas..." />;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {blocks.length === 0 ? (
        <StandaloneListEmptyState
          icon="shield-check"
          title="No tienes cuentas bloqueadas"
          description="Los contactos que bloquees desde una conversación aparecerán aquí."
        />
      ) : (
        <GroupedListSection title="Contactos bloqueados">
          {blocks.map((block, index) => (
            <GroupedListRow
              key={block.id}
              icon={block.counterpartType === "BUSINESS" ? "house" : "user"}
              label={block.counterpartLabel}
              description={formatBlockedDate(block.createdAt)}
              showSeparator={index < blocks.length - 1}
              onPress={() => openUnblockConfirmation(block)}
            />
          ))}
        </GroupedListSection>
      )}
    </ScrollView>
  );
}

function createStyles(t: Theme, topInset: number, bottomInset: number) {
  return StyleSheet.create({
    content: {
      paddingTop: topInset + t.spacing.md,
      paddingHorizontal: t.spacing.md,
      paddingBottom: bottomInset + t.spacing.xl,
      gap: t.spacing.lg,
    },
  });
}
