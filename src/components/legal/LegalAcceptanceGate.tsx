import Button from "@/src/components/button/Button";
import {
  GroupedListSection,
  GroupedListRow,
} from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  acceptCurrentLegalDocuments,
  getCurrentLegalAcceptanceState,
  LEGAL_DOCUMENT_CODES,
} from "@/src/services/legal-document.service";
import { useTheme } from "@/src/themes";
import { openSignOutConfirmation } from "@/src/utils/openSignOutConfirmation";
import { showError } from "@/src/utils/useToast";
import { router, usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LegalAcceptanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const pathname = usePathname();
  const { state, revision } = useActiveProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (state === "signed_out") {
      setIsAccepted(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await getCurrentLegalAcceptanceState();
    if (!result.ok) {
      setIsAccepted(false);
      setIsLoading(false);
      return;
    }
    setIsAccepted(result.data.accepted);
    setIsLoading(false);
  }, [state]);

  useEffect(() => {
    void refresh();
  }, [refresh, revision]);

  if (pathname === "/legal-document" || pathname.endsWith("/legal-document")) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <LoadingState label="Verificando documentos legales..." />;
  }

  if (isAccepted) return <>{children}</>;

  const openDocument = (code: string, title: string) => {
    router.push({
      pathname: "/(detail)/legal-document",
      params: { code, title, hideMenu: "true" },
    });
  };

  const accept = async () => {
    if (!isChecked || isSubmitting) return;
    setIsSubmitting(true);
    const result = await acceptCurrentLegalDocuments();
    setIsSubmitting(false);
    if (!result.ok) {
      showError("No se pudo guardar tu aceptación", result.error.message);
      return;
    }
    setIsAccepted(true);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.icon}>
            <Icon name="shield-check" size={28} color={t.colors.primary} />
          </View>
          <Text variant="title">Documentos legales</Text>
          <Text variant="body" color="textMedium">
            Revisa los documentos vigentes y confirma tu aceptación para
            continuar usando Luppit.
          </Text>
        </View>

        <GroupedListSection title="Documentos vigentes">
          <GroupedListRow
            icon="file-pen-line"
            label="Términos y condiciones"
            onPress={() =>
              openDocument(
                LEGAL_DOCUMENT_CODES.termsConditions,
                "Términos y condiciones"
              )
            }
          />
          <GroupedListRow
            icon="file-text"
            label="Política de privacidad"
            showSeparator={false}
            onPress={() =>
              openDocument(
                LEGAL_DOCUMENT_CODES.privacyPolicy,
                "Política de privacidad"
              )
            }
          />
        </GroupedListSection>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isChecked }}
          style={styles.checkboxRow}
          onPress={() => setIsChecked((value) => !value)}
        >
          <View style={[styles.checkbox, isChecked ? styles.checkboxChecked : null]}>
            {isChecked ? (
              <Icon name="check" size={16} color={t.colors.backgroudWhite} />
            ) : null}
          </View>
          <View style={styles.checkboxCopy}>
            <Text variant="body" style={styles.checkboxLabel}>
              Acepto los documentos vigentes
            </Text>
            <Text variant="small" color="textMedium">
              Confirmo que leí los Términos y la Política de privacidad.
            </Text>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <Button
            title="Aceptar y continuar"
            variant="dark"
            disabled={!isChecked}
            loading={isSubmitting}
            onPress={() => void accept()}
          />
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            style={styles.signOut}
            onPress={openSignOutConfirmation}
          >
            <Text variant="small" color="textMedium">
              Cerrar sesión
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    content: {
      flexGrow: 1,
      gap: t.spacing.lg,
      paddingHorizontal: t.spacing.md,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.lg,
    },
    header: {
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.sm,
    },
    icon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
    },
    checkboxRow: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      padding: t.spacing.md,
      ...createRoundedSurfaceStyle(t),
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primary,
    },
    checkboxCopy: {
      flex: 1,
      gap: t.spacing.xs,
    },
    checkboxLabel: {
      color: t.colors.textDark,
    },
    actions: {
      marginTop: "auto",
      gap: t.spacing.sm,
      paddingTop: t.spacing.md,
    },
    signOut: {
      alignSelf: "center",
      padding: t.spacing.sm,
    },
  });
}
