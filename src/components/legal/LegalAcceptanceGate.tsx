import Button from "@/src/components/button/Button";
import GlassSurface from "@/src/components/glass/GlassSurface";
import {
  GroupedList,
  GroupedListRow,
} from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Text } from "@/src/components/Text";
import { signOut } from "@/src/lib/supabase";
import { supabase } from "@/src/lib/supabase/client";
import {
  acceptCurrentLegalDocuments,
  getCurrentLegalAcceptanceState,
  LEGAL_DOCUMENT_CODES,
} from "@/src/services/legal-document.service";
import { useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { router, usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepted, setIsAccepted] = useState(true);
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (state === "signed_out") {
      setIsAccepted(true);
      setIsLoading(false);
      return;
    }

    const session = await supabase.auth.getSession();
    if (!session.data.session?.user.id) {
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
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => data.subscription.unsubscribe();
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
      <GlassSurface
        variant="surface"
        style={styles.card}
        contentStyle={styles.cardContent}
      >
        <View style={styles.icon}>
          <Icon name="shield-check" size={30} color={t.colors.primary} />
        </View>
        <Text variant="title" align="center">
          Documentos legales actualizados
        </Text>
        <Text variant="body" color="textMedium" align="center">
          Revisa y acepta los documentos vigentes para continuar usando Luppit.
        </Text>

        <GroupedList>
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
        </GroupedList>

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
          <Text variant="small" style={styles.checkboxLabel}>
            He leído y acepto los Términos y condiciones y la Política de
            privacidad vigentes.
          </Text>
        </Pressable>

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
          onPress={() => void signOut()}
        >
          <Text variant="small" color="textMedium">
            Cerrar sesión
          </Text>
        </Pressable>
      </GlassSurface>
    </SafeAreaView>
  );
}

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: "center",
      padding: t.spacing.md,
      backgroundColor: t.colors.background,
    },
    card: {
      width: "100%",
    },
    cardContent: {
      padding: t.spacing.xl,
      gap: t.spacing.md,
    },
    icon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
    },
    checkboxRow: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.sm,
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
    checkboxLabel: {
      flex: 1,
      color: t.colors.textDark,
    },
    signOut: {
      alignSelf: "center",
      padding: t.spacing.sm,
    },
  });
}
