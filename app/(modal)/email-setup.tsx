import Button from "@/src/components/button/Button";
import { GroupedListSection } from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import LoadingState from "@/src/components/loading/LoadingState";
import OtpValidator from "@/src/components/otpValidator/OtpValidator";
import { Text } from "@/src/components/Text";
import {
  getCurrentProfileEmailSetupStatus,
  requestCurrentProfileEmailSetupVerification,
  resendCurrentProfileEmailSetupVerification,
  verifyCurrentProfileEmailSetup,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import {
  showError,
  showMissingFields,
  showSuccess,
} from "@/src/utils/useToast";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 4;
const RESEND_INTERVAL_SECONDS = 60;

type EmailSetupStep = "email" | "otp";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function maskEmail(value: string) {
  const [localPart = "", domain = ""] = value.split("@");

  if (!localPart || !domain) return value;

  const visibleLocal =
    localPart.length <= 2
      ? `${localPart[0] ?? ""}${"*".repeat(Math.max(localPart.length - 1, 0))}`
      : `${localPart.slice(0, 2)}${"*".repeat(localPart.length - 2)}`;

  return `${visibleLocal}@${domain}`;
}

export default function EmailSetupScreen() {
  const t = useTheme();
  const [step, setStep] = useState<EmailSetupStep>("email");
  const [email, setEmail] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [emailServerError, setEmailServerError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [didTryEmailSubmit, setDidTryEmailSubmit] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    let active = true;

    const loadEmailSetup = async () => {
      setIsLoading(true);
      const result = await getCurrentProfileEmailSetupStatus();
      if (!active) return;

      if (!result.ok) {
        showError("No se pudo cargar la configuración", result.error.message);
        setIsLoading(false);
        return;
      }

      setEmail(result.data.email ?? "");
      setEmailOptIn(result.data.emailOptIn);
      setIsLoading(false);
    };

    void loadEmailSetup();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timeout = setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [resendCountdown]);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const isEmailValid =
    normalizedEmail.length > 0 && EMAIL_REGEX.test(normalizedEmail);
  const emailError =
    emailServerError ||
    (didTryEmailSubmit && normalizedEmail.length > 0 && !isEmailValid
      ? "Ingresa un correo válido."
      : "");
  const canAttemptSendCode = !isLoading && !isSendingCode && !isVerifying;
  const canAttemptVerifyCode = !isLoading && !isSendingCode && !isVerifying;
  const maskedEmail = useMemo(() => maskEmail(normalizedEmail), [normalizedEmail]);

  const styles = useMemo(() => createEmailSetupStyles(t), [t]);

  const handleSendCode = async () => {
    setDidTryEmailSubmit(true);
    setEmailServerError("");
    const missingFields: string[] = [];
    if (!normalizedEmail) missingFields.push("correo electrónico");
    if (!emailOptIn) missingFields.push("aceptación para recibir correos");
    showMissingFields(missingFields);
    if (missingFields.length > 0 || !isEmailValid) return;

    setIsSendingCode(true);
    const result = await requestCurrentProfileEmailSetupVerification({
      email: normalizedEmail,
    });
    setIsSendingCode(false);

    if (!result.ok) {
      if (result.error.code === "email_already_in_use") {
        setEmailServerError(result.error.message);
        return;
      }
      showError("No se pudo enviar el código", result.error.message);
      return;
    }

    setOtpCode("");
    setOtpError("");
    setStep("otp");
    setResendCountdown(RESEND_INTERVAL_SECONDS);
    showSuccess("Te enviamos un código para verificar tu correo");
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0 || isSendingCode || isVerifying) return;

    setIsSendingCode(true);
    const result = await resendCurrentProfileEmailSetupVerification({
      email: normalizedEmail,
    });
    setIsSendingCode(false);

    if (!result.ok) {
      if (result.error.code === "email_already_in_use") {
        setStep("email");
        setOtpCode("");
        setOtpError("");
        setEmailServerError(result.error.message);
        return;
      }
      showError("No se pudo reenviar el código", result.error.message);
      return;
    }

    setOtpError("");
    setResendCountdown(RESEND_INTERVAL_SECONDS);
    showSuccess("Te enviamos un nuevo código");
  };

  const handleVerifyCode = async () => {
    if (!otpCode) {
      showMissingFields(["código de verificación"]);
      return;
    }
    if (otpCode.length !== OTP_LENGTH) {
      setOtpError(`Ingresa el código completo de ${OTP_LENGTH} dígitos.`);
      return;
    }
    if (!canAttemptVerifyCode) return;

    setIsVerifying(true);
    const result = await verifyCurrentProfileEmailSetup({
      email: normalizedEmail,
      token: otpCode,
      emailOptIn,
    });
    setIsVerifying(false);

    if (!result.ok) {
      if (result.error.code === "email_already_in_use") {
        setStep("email");
        setOtpCode("");
        setOtpError("");
        setEmailServerError(result.error.message);
        return;
      }
      setOtpError(result.error.message);
      return;
    }

    showSuccess("Correo verificado");
    router.back();
  };

  const handleEditEmail = () => {
    setStep("email");
    setOtpCode("");
    setOtpError("");
    setEmailServerError("");
  };

  const resendCountdownLabel = `Puedes reenviar en 0:${String(
    resendCountdown
  ).padStart(2, "0")}`;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingState
            label="Cargando configuración..."
            variant="inline"
            style={styles.loadingState}
          />
        ) : step === "email" ? (
          <View style={styles.stepContent}>
            <View style={styles.intro}>
              <Text variant="subtitle" accessibilityRole="header">
                Configura tu correo
              </Text>
              <Text variant="body" color="textMedium">
                Aquí recibirás códigos, confirmaciones y avisos importantes.
              </Text>
            </View>

            <GroupedListSection title="Datos de contacto">
              <View style={styles.formContent}>
                <Text variant="body">Correo electrónico</Text>
                <TextField
                  accessibilityLabel="Correo electrónico"
                  accessibilityHint={
                    emailError || "Ingresa la dirección que quieres verificar"
                  }
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (emailServerError) setEmailServerError("");
                    if (otpError) setOtpError("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    void handleSendCode();
                  }}
                  placeholder="nombre@correo.com"
                  hasError={Boolean(emailError)}
                  error={emailError}
                  baseContainerStyle={styles.inputContainer}
                />
              </View>
            </GroupedListSection>

            <GroupedListSection title="Preferencias de correo">
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: emailOptIn }}
                accessibilityHint="Necesario para recibir códigos, confirmaciones y avisos de entrega"
                onPress={() => setEmailOptIn((current) => !current)}
                style={styles.consentRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    emailOptIn ? styles.checkboxSelected : null,
                  ]}
                >
                  {emailOptIn ? (
                    <Icon
                      name="check"
                      size={14}
                      color={t.colors.backgroudWhite}
                    />
                  ) : null}
                </View>
                <View style={styles.consentCopy}>
                  <Text variant="body">Acepto recibir correos de Luppit</Text>
                  <Text variant="small" color="textMedium">
                    Incluye códigos, confirmaciones y avisos de entrega.
                  </Text>
                </View>
              </Pressable>
            </GroupedListSection>

            <Button
              variant="dark"
              title="Enviar código"
              loading={isSendingCode}
              disabled={!canAttemptSendCode}
              onPress={() => {
                void handleSendCode();
              }}
            />
          </View>
        ) : (
          <View style={styles.stepContent}>
            <View style={styles.intro}>
              <Text variant="subtitle" accessibilityRole="header">
                Ingresa el código
              </Text>
              <Text variant="body" color="textMedium">
                Enviamos un código de 4 dígitos a:
              </Text>
              <View style={styles.emailDestination}>
                <Text variant="body" maxLines={2}>
                  {maskedEmail}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleEditEmail}
                  style={styles.secondaryAction}
                >
                  <Text variant="body" color="primary">
                    Cambiar correo
                  </Text>
                </Pressable>
              </View>
            </View>

            <GroupedListSection title="Código de verificación">
              <View style={styles.otpContent}>
                <OtpValidator
                  label="Código de 4 dígitos"
                  accessibilityLabel={`Código de 4 dígitos enviado a ${maskedEmail}`}
                  errorText={otpError}
                  otpLength={OTP_LENGTH}
                  stretch
                  onChange={(value) => {
                    setOtpCode(value);
                    if (otpError) setOtpError("");
                  }}
                />
              </View>
            </GroupedListSection>

            <View style={styles.actionStack}>
              <Button
                variant="dark"
                title="Verificar correo"
                loading={isVerifying}
                disabled={!canAttemptVerifyCode}
                onPress={() => {
                  void handleVerifyCode();
                }}
              />

              {resendCountdown > 0 || isSendingCode ? (
                <View style={styles.resendStatus}>
                  <Text variant="small" color="textMedium" align="center">
                    {isSendingCode
                      ? "Reenviando código..."
                      : resendCountdownLabel}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void handleResendCode();
                  }}
                  disabled={isVerifying}
                  style={styles.resendButton}
                >
                  <Text variant="body" color="primary" align="center">
                    Reenviar código
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

function createEmailSetupStyles(t: Theme) {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.xl,
    },
    stepContent: {
      gap: t.spacing.lg,
    },
    intro: {
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.md,
    },
    formContent: {
      padding: t.spacing.md,
      gap: t.spacing.sm,
    },
    inputContainer: {
      marginBottom: 0,
    },
    consentRow: {
      minHeight: 74,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
    },
    consentCopy: {
      flex: 1,
      gap: t.spacing.xs,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: t.borders.sm,
      borderWidth: 1,
      borderColor: t.colors.textMedium,
      backgroundColor: t.colors.backgroudWhite,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primary,
    },
    emailDestination: {
      gap: t.spacing.xs,
    },
    secondaryAction: {
      minHeight: 44,
      alignSelf: "flex-start",
      justifyContent: "center",
    },
    otpContent: {
      padding: t.spacing.md,
    },
    actionStack: {
      gap: t.spacing.sm,
    },
    resendStatus: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    resendButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
