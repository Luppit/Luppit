import Button from "@/src/components/button/Button";
import HintModal from "@/src/components/hintModal/HintModal";
import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import LoadingState from "@/src/components/loading/LoadingState";
import OtpValidator from "@/src/components/otpValidator/OtpValidator";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import {
  getCurrentProfileEmailSetupStatus,
  requestCurrentProfileEmailSetupVerification,
  resendCurrentProfileEmailSetupVerification,
  verifyCurrentProfileEmailSetup,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [didTryEmailSubmit, setDidTryEmailSubmit] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(false);
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
  const emailError = didTryEmailSubmit
    ? normalizedEmail.length === 0
      ? "Ingresa el correo donde quieres recibir notificaciones."
      : !isEmailValid
        ? "Ingresa un correo válido."
        : ""
    : "";
  const consentError =
    didTryEmailSubmit && !emailOptIn
      ? "Debes aceptar recibir correos para continuar."
      : "";
  const canSendCode =
    isEmailValid && emailOptIn && !isLoading && !isSendingCode && !isVerifying;
  const canVerifyCode =
    otpCode.length === OTP_LENGTH &&
    !isLoading &&
    !isSendingCode &&
    !isVerifying;
  const maskedEmail = useMemo(() => maskEmail(normalizedEmail), [normalizedEmail]);

  const styles = useMemo(() => createEmailSetupStyles(t), [t]);

  const handleSendCode = async () => {
    setDidTryEmailSubmit(true);
    if (!isEmailValid || !emailOptIn) return;

    setIsSendingCode(true);
    const result = await requestCurrentProfileEmailSetupVerification({
      email: normalizedEmail,
    });
    setIsSendingCode(false);

    if (!result.ok) {
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
      showError("No se pudo reenviar el código", result.error.message);
      return;
    }

    setOtpError("");
    setResendCountdown(RESEND_INTERVAL_SECONDS);
    showSuccess("Te enviamos un nuevo código");
  };

  const handleVerifyCode = async () => {
    if (!canVerifyCode) return;

    setIsVerifying(true);
    const result = await verifyCurrentProfileEmailSetup({
      email: normalizedEmail,
      token: otpCode,
      emailOptIn,
    });
    setIsVerifying(false);

    if (!result.ok) {
      setOtpError("No pudimos validar el código. Intenta nuevamente.");
      return;
    }

    showSuccess("Correo verificado");
    router.back();
  };

  const handleEditEmail = () => {
    setStep("email");
    setOtpCode("");
    setOtpError("");
  };

  const resendLabel =
    resendCountdown > 0
      ? `Reenviar en 0:${String(resendCountdown).padStart(2, "0")}`
      : "Reenviar código";

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.layout}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                variant="small"
                color="textMedium"
                style={styles.sectionTitle}
                accessibilityRole="header"
                accessibilityLabel={
                  step === "email" ? "Paso 1 de 2, Correo" : "Paso 2 de 2, Código"
                }
              >
                {step === "email" ? "Correo" : "Código"}
              </Text>
            </View>

            <View style={styles.surface}>
              {step === "email" ? (
                <View style={styles.sectionContent}>
                  <Text variant="small" color="textMedium">
                    Para códigos y notificaciones.
                  </Text>

                  <TextField
                    accessibilityLabel="Correo"
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (otpError) setOtpError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    hasError={Boolean(emailError)}
                    error={emailError}
                    baseContainerStyle={styles.inputContainer}
                  />

                  <Button
                    variant="dark"
                    title="Enviar código"
                    loading={isSendingCode}
                    disabled={!canSendCode}
                    onPress={() => {
                      void handleSendCode();
                    }}
                  />

                  <View style={styles.consentBlock}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: emailOptIn }}
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
                      <Text variant="body" style={styles.consentLabel}>
                        Recibir correos
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setIsHintVisible(true)}
                      hitSlop={8}
                      style={styles.infoButton}
                      accessibilityRole="button"
                      accessibilityLabel="Información sobre recibir correos"
                    >
                      <Icon
                        name="info"
                        size={16}
                        color={t.colors.stateAnulated}
                      />
                    </Pressable>
                  </View>
                  {consentError ? (
                    <Text variant="small" color="error">
                      {consentError}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.sectionContent}>
                  <View style={styles.emailHeader}>
                    <View style={styles.emailLine}>
                      <Text
                        variant="body"
                        color="textMedium"
                        style={styles.emailText}
                        maxLines={1}
                      >
                        Enviado a {maskedEmail}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={handleEditEmail}
                        hitSlop={8}
                        style={[styles.linkButton, styles.emailChangeButton]}
                      >
                        <Text variant="small" color="textDark">
                          Cambiar
                        </Text>
                      </Pressable>
                    </View>
                    <View style={styles.emailHeaderSeparator} />
                  </View>

                  <View style={styles.otpBlock}>
                    <OtpValidator
                      label=""
                      accessibilityLabel="Código"
                      otpLength={OTP_LENGTH}
                      onChange={(value) => {
                        setOtpCode(value);
                        if (otpError) setOtpError("");
                      }}
                    />
                    {otpError ? (
                      <Text
                        variant="small"
                        color="error"
                        style={styles.otpError}
                      >
                        {otpError}
                      </Text>
                    ) : null}
                  </View>

                  <Button
                    variant="dark"
                    title="Verificar"
                    loading={isVerifying}
                    disabled={!canVerifyCode}
                    onPress={() => {
                      void handleVerifyCode();
                    }}
                  />

                  <View style={styles.inlineActions}>
                    <Pressable
                      onPress={() => {
                        void handleResendCode();
                      }}
                      disabled={resendCountdown > 0 || isSendingCode || isVerifying}
                      style={styles.linkButton}
                    >
                      <Text
                        variant="small"
                        color={
                          resendCountdown > 0 ? "stateAnulated" : "textDark"
                        }
                      >
                        {resendLabel}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {isLoading ? (
                <LoadingState
                  label="Cargando configuración..."
                  variant="inline"
                  style={styles.loadingRow}
                />
              ) : null}
            </View>
          </View>
        </View>

        <HintModal
          visible={isHintVisible}
          text="Luppit te enviará correos transaccionales a esta dirección, como códigos OTP, confirmaciones y avisos de entrega."
          onClose={() => setIsHintVisible(false)}
        />
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
    layout: {
      flex: 1,
      gap: t.spacing.sm,
    },
    section: {
      gap: t.spacing.sm,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    sectionTitle: {
      flex: 1,
      paddingLeft: t.spacing.md,
    },
    surface: {
      ...createRoundedSurfaceStyle(t),
      overflow: "hidden",
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    sectionContent: {
      gap: t.spacing.md,
    },
    inputContainer: {
      marginBottom: 0,
    },
    consentBlock: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
    },
    consentRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: t.borders.sm,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primary,
    },
    consentLabel: {
      flex: 1,
      color: t.colors.textDark,
    },
    infoButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    emailLine: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    emailHeader: {
      gap: t.spacing.xs,
    },
    emailText: {
      flex: 1,
      minWidth: 0,
    },
    emailChangeButton: {
      flexShrink: 0,
    },
    emailHeaderSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(0,0,0,0.08)",
    },
    otpBlock: {
      gap: t.spacing.sm,
    },
    otpError: {
      paddingLeft: t.spacing.sm,
    },
    inlineActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    linkButton: {
      paddingVertical: t.spacing.xs,
    },
    loadingRow: {
      alignItems: "center",
      paddingVertical: t.spacing.sm,
    },
  });
}
