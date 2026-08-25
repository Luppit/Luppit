import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import LoadingState from "@/src/components/loading/LoadingState";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  AccountOnboarding,
  cancelCurrentIdentityOnboarding,
  getCurrentAccountOnboarding,
  startCurrentUserIdentityVerification,
} from "@/src/services/identity-verification.service";
import { signOutLocally } from "@/src/lib/supabase/auth";
import { openPopup } from "@/src/services/popup.service";
import { Theme, useTheme } from "@/src/themes";
import { showError } from "@/src/utils/useToast";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const pollDelays = [1000, 1500, 2500, 3500, 5000];

export default function IdentityVerificationScreen() {
  const t = useTheme();
  const s = useMemo(() => createStyles(t), [t]);
  const { profiles, refreshProfiles } = useActiveProfile();
  const [onboarding, setOnboarding] = useState<AccountOnboarding | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasCompletedCapture, setHasCompletedCapture] = useState(false);
  const mountedRef = useRef(true);

  const loadStatus = useCallback(async (showRefreshProgress = false) => {
    if (showRefreshProgress && mountedRef.current) setIsRefreshing(true);
    try {
      const result = await getCurrentAccountOnboarding();
      if (!mountedRef.current) return null;
      if (!result.ok) {
        showError("No pudimos consultar tu verificación", result.error.message);
        return null;
      }
      setOnboarding(result.data);
      if (result.data.profileId) {
        const activated = await refreshProfiles(result.data.profileId);
        if (activated && mountedRef.current) router.replace("/(tabs)");
      }
      return result.data;
    } finally {
      if (showRefreshProgress && mountedRef.current) setIsRefreshing(false);
    }
  }, [refreshProfiles]);

  useEffect(() => {
    mountedRef.current = true;
    void loadStatus().finally(() => {
      if (mountedRef.current) setIsLoading(false);
    });
    return () => {
      mountedRef.current = false;
    };
  }, [loadStatus]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void loadStatus();
    });
    return () => subscription.remove();
  }, [loadStatus]);

  useEffect(() => {
    const shouldPoll = onboarding?.identityStatus === "IN_REVIEW" ||
      (onboarding?.identityStatus === "IN_PROGRESS" && hasCompletedCapture);
    if (!shouldPoll) return;

    const interval = setInterval(() => void loadStatus(), 4000);
    return () => clearInterval(interval);
  }, [hasCompletedCapture, loadStatus, onboarding?.identityStatus]);

  const pollBackendStatus = useCallback(async () => {
    for (const delay of pollDelays) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (!mountedRef.current) return;
      const next = await loadStatus();
      if (
        !next ||
        next.identityStatus === "VERIFIED" ||
        next.identityStatus === "ACTION_REQUIRED" ||
        next.identityStatus === "INELIGIBLE"
      ) {
        return;
      }
    }
  }, [loadStatus]);

  const startVerification = async () => {
    if (onboarding?.identityStatus === "NOT_STARTED" && !consentAccepted) {
      showError("Acepta el consentimiento para continuar.");
      return;
    }
    setHasCompletedCapture(false);
    setIsStarting(true);
    const started = await startCurrentUserIdentityVerification();
    if (!started.ok) {
      setIsStarting(false);
      showError("No pudimos iniciar la verificación", started.error.message);
      return;
    }

    try {
      const { startVerification: launchDidit } = await import(
        "@didit-protocol/sdk-react-native"
      );
      const result = await launchDidit(started.data.sessionToken, {
        languageCode: "es",
        loggingEnabled: false,
        showCloseButton: true,
        showExitConfirmation: true,
        closeOnComplete: true,
      });
      if (result.type === "failed") {
        showError(
          "No pudimos completar la captura",
          "Revisa los permisos de cámara e inténtalo nuevamente."
        );
      } else if (result.type === "completed") {
        setHasCompletedCapture(true);
      }
      await loadStatus();
      if (result.type === "completed") await pollBackendStatus();
    } catch {
      showError(
        "No pudimos abrir la verificación",
        "Revisa tu conexión y los permisos de cámara e inténtalo nuevamente."
      );
      await loadStatus();
    } finally {
      if (mountedRef.current) setIsStarting(false);
    }
  };

  const cancelVerification = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelCurrentIdentityOnboarding();
      if (!result.ok) {
        showError(
          "No pudimos cancelar la verificación",
          result.error.message,
        );
        return false;
      }

      try {
        await signOutLocally();
      } catch {
        showError(
          "Verificación cancelada",
          "No pudimos volver a la pantalla de acceso. Inténtalo nuevamente.",
        );
        return false;
      }
      return true;
    } finally {
      if (mountedRef.current) setIsCancelling(false);
    }
  };

  const openCancelConfirmation = () => {
    openPopup({
      type: "summary",
      title: "Cancelar verificación",
      icon: "x-circle",
      description:
        "Se eliminará el avance incompleto de esta verificación en Luppit. " +
        "Podrás empezar de nuevo más adelante. Tu cuenta telefónica y tus perfiles existentes se conservarán. " +
        "Volverás a la pantalla de acceso.",
      actions: [
        {
          id: "keep-identity-verification",
          label: "Volver",
          icon: "arrow-left",
        },
        {
          id: "cancel-identity-verification",
          label: "Cancelar",
          icon: "x-circle",
          textColorKey: "error",
          iconColorKey: "error",
          onPress: cancelVerification,
        },
      ],
    });
  };

  if (isLoading || !onboarding) {
    return <LoadingState label="Consultando tu verificación..." />;
  }

  const status = onboarding.identityStatus;
  const isProcessing = status === "IN_REVIEW" ||
    (status === "IN_PROGRESS" && hasCompletedCapture);
  const canLaunch = status === "NOT_STARTED" ||
    (status === "IN_PROGRESS" && !hasCompletedCapture) ||
    status === "ACTION_REQUIRED";
  const title = isProcessing
    ? "Estamos verificando tus datos"
    : status === "INELIGIBLE"
    ? "No pudimos habilitar tu perfil"
    : status === "ACTION_REQUIRED"
    ? "Necesitamos otra verificación"
    : status === "IN_PROGRESS"
    ? "Continúa tu verificación"
    : "Verifica tu identidad";
  const description = isProcessing
    ? "Recibimos tu información. Esto puede tomar unos segundos."
    : status === "INELIGIBLE"
    ? "Contacta a soporte si consideras que se trata de un error."
    : status === "ACTION_REQUIRED"
    ? "La captura anterior no pudo completarse. Tus avances de registro están guardados."
    : "Procesaremos tu cédula y una prueba facial para verificar tu identidad.";
  const verificationButton = (
    <Button
      title={status === "ACTION_REQUIRED"
        ? "Intentar nuevamente"
        : status === "IN_PROGRESS"
        ? "Continuar verificación"
        : "Verificar mi identidad"}
      variant="dark"
      loading={isStarting}
      disabled={
        isStarting || isCancelling ||
        (status === "NOT_STARTED" && !consentAccepted)
      }
      onPress={() => void startVerification()}
    />
  );

  return (
    <ScrollView
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <View style={s.iconContainer}>
          {isProcessing ? (
            <ActivityIndicator color={t.colors.primary} />
          ) : (
            <Icon
              name={status === "INELIGIBLE" ? "alert-circle" : "shield-check"}
              size={28}
              color={t.colors.primary}
            />
          )}
        </View>
        <Text variant="subtitle" style={s.centered}>{title}</Text>
        <Text color="textMedium" style={s.description}>{description}</Text>
      </View>

      <View style={s.actions}>
        {canLaunch && status === "NOT_STARTED" ? (
          <View style={s.surface}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentAccepted }}
              style={s.consentRow}
              onPress={() => setConsentAccepted((value) => !value)}
            >
              <View style={[s.checkbox, consentAccepted ? s.checkboxSelected : null]}>
                {consentAccepted ? (
                  <Icon name="check" size={15} color={t.colors.backgroudWhite} />
                ) : null}
              </View>
              <Text style={s.consentText}>
                Acepto el procesamiento necesario para verificar mi identidad.
              </Text>
            </Pressable>

            {verificationButton}
          </View>
        ) : canLaunch ? (
          verificationButton
        ) : null}

        {isProcessing || status === "IN_PROGRESS" ? (
          <Button
            title="Actualizar estado"
            variant="white"
            loading={isRefreshing}
            disabled={isStarting || isCancelling}
            onPress={() => void loadStatus(true)}
          />
        ) : null}

        {onboarding.canCancel ? (
          <Button
            title="Cancelar verificación"
            variant="white"
            loading={isCancelling}
            disabled={isStarting || isRefreshing}
            onPress={openCancelConfirmation}
          />
        ) : null}

        {profiles.length > 0 ? (
          <Button
            title="Volver a la app"
            variant="white"
            disabled={isStarting || isCancelling}
            onPress={() => router.replace("/(tabs)")}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.xl,
      paddingBottom: t.spacing.xl,
      gap: t.spacing.lg,
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
    },
    header: {
      alignItems: "center",
      gap: t.spacing.sm,
    },
    iconContainer: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      ...createRoundedSurfaceStyle(t),
    },
    centered: {
      textAlign: "center",
    },
    description: {
      maxWidth: 340,
      textAlign: "center",
    },
    actions: {
      width: "100%",
      gap: t.spacing.md,
    },
    surface: {
      ...createRoundedSurfaceStyle(t),
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    consentRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.sm,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primary,
    },
    consentText: {
      flex: 1,
    },
  });
}
