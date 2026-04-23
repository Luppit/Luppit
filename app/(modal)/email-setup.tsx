import Button from "@/src/components/button/Button";
import HintModal from "@/src/components/hintModal/HintModal";
import { Icon } from "@/src/components/Icon";
import OtpValidator from "@/src/components/otpValidator/OtpValidator";
import { Text } from "@/src/components/Text";
import {
  getCurrentProfileEmailSetupStatus,
  requestCurrentProfileEmailSetupVerification,
  resendCurrentProfileEmailSetupVerification,
  verifyCurrentProfileEmailSetup,
} from "@/src/services/profile.service";
import { useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
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

  const styles = useMemo(
    () => ({
      scrollContent: {
        flexGrow: 1,
        paddingTop: t.spacing.lg,
        paddingBottom: t.spacing.xl,
      },
      layout: {
        flex: 1,
        justifyContent: "center" as const,
        gap: t.spacing.sm,
      },
      surface: {
        backgroundColor: t.colors.backgroudWhite,
        borderRadius: t.borders.md,
        borderWidth: 1,
        borderColor: "#ECECEC",
        padding: t.spacing.lg,
        gap: t.spacing.md,
      },
      stepRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.md,
      },
      stepDot: {
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: t.colors.border,
      },
      stepDotActive: {
        backgroundColor: t.colors.textDark,
      },
      section: {
        gap: t.spacing.md,
      },
      titleBlock: {
        alignItems: "center" as const,
        gap: 6,
      },
      centeredBlock: {
        alignItems: "center" as const,
        gap: 6,
      },
      inputSection: {
        gap: t.spacing.sm,
      },
      inputShell: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        borderWidth: 1,
        borderColor: isEmailValid
          ? t.colors.primary
          : emailError
            ? t.colors.error
            : t.colors.border,
        borderRadius: t.borders.md,
        backgroundColor: t.colors.backgroudWhite,
        minHeight: 56,
        paddingLeft: t.spacing.md,
        paddingRight: t.spacing.sm,
        gap: t.spacing.sm,
      },
      emailInput: {
        flex: 1,
        minHeight: 56,
        fontFamily: t.typography.body.fontFamily,
        fontSize: t.fontSizes.md,
        lineHeight: t.lineHeights.md,
        color: t.colors.textDark,
      },
      inputHelperRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: t.spacing.xs,
      },
      consentRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: t.spacing.sm,
        alignSelf: "center" as const,
      },
      infoButton: {
        alignItems: "center" as const,
        justifyContent: "center" as const,
        padding: 2,
      },
      checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: emailOptIn ? t.colors.primary : t.colors.border,
        backgroundColor: emailOptIn ? t.colors.primary : t.colors.backgroudWhite,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
      consentLabel: {
        color: t.colors.textDark,
      },
      otpBlock: {
        gap: t.spacing.md,
      },
      otpBackButton: {
        alignSelf: "flex-start" as const,
        padding: 2,
      },
      otpError: {
        paddingHorizontal: t.spacing.sm,
      },
      inlineActions: {
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        alignItems: "center" as const,
        gap: t.spacing.md,
      },
      linkButton: {
        paddingVertical: 2,
      },
      footerNote: {
        paddingHorizontal: t.spacing.sm,
      },
      secondaryText: {
        paddingHorizontal: t.spacing.sm,
      },
      loadingRow: {
        alignItems: "center" as const,
        paddingVertical: t.spacing.sm,
      },
    }),
    [emailError, emailOptIn, isEmailValid, t]
  );

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
          <View style={styles.stepRow}>
            <Text variant="caption" color="stateAnulated">
              Paso {step === "email" ? "1" : "2"} de 2
            </Text>
            <View
              style={[styles.stepDot, step === "email" ? styles.stepDotActive : null]}
            />
            <View
              style={[styles.stepDot, step === "otp" ? styles.stepDotActive : null]}
            />
          </View>

          <View style={styles.surface}>
            {step === "email" ? (
              <View style={styles.section}>
                <View style={styles.titleBlock}>
                  <Text variant="subtitle" align="center">
                    Verifica tu correo
                  </Text>
                  <Text
                    variant="body"
                    color="stateAnulated"
                    align="center"
                    style={styles.secondaryText}
                  >
                    Ingresa el correo donde quieres recibir tus códigos y
                    notificaciones.
                  </Text>
                </View>

                <View style={styles.inputSection}>
                  <View style={styles.inputShell}>
                    <TextInput
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
                      placeholderTextColor={t.colors.stateAnulated}
                      style={styles.emailInput}
                    />
                    {normalizedEmail.length > 0 ? (
                      isEmailValid ? (
                        <Icon
                          name="check"
                          size={18}
                          color={t.colors.primary}
                        />
                      ) : null
                    ) : null}
                  </View>
                  {emailError ? (
                    <Text variant="caption" color="error" align="center">
                      {emailError}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.inputHelperRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: emailOptIn }}
                    onPress={() => setEmailOptIn((current) => !current)}
                    style={styles.consentRow}
                  >
                    <View style={styles.checkbox}>
                      {emailOptIn ? (
                        <Icon
                          name="check"
                          size={14}
                          color={t.colors.backgroudWhite}
                        />
                      ) : null}
                    </View>
                    <Text variant="body" style={styles.consentLabel}>
                      Recibir correos de Luppit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setIsHintVisible(true)}
                    hitSlop={8}
                    style={styles.infoButton}
                  >
                    <Icon
                      name="info"
                      size={16}
                      color={t.colors.stateAnulated}
                    />
                  </Pressable>
                </View>
                {consentError ? (
                  <Text variant="caption" color="error" align="center">
                    {consentError}
                  </Text>
                ) : null}

                <Button
                  variant="dark"
                  title={isSendingCode ? "Enviando..." : "Enviar código"}
                  disabled={!canSendCode}
                  onPress={() => {
                    void handleSendCode();
                  }}
                />
              </View>
            ) : (
              <View style={styles.section}>
                <Pressable onPress={handleEditEmail} style={styles.otpBackButton}>
                  <Icon name="arrow-left" size={18} color={t.colors.textDark} />
                </Pressable>

                <View style={styles.centeredBlock}>
                  <Text variant="subtitle" align="center">
                    Verifica tu correo
                  </Text>
                  <Text
                    variant="body"
                    color="stateAnulated"
                    align="center"
                    style={styles.secondaryText}
                  >
                    Ingresa el código enviado a
                  </Text>
                  <Text variant="body" align="center">
                    {maskedEmail}
                  </Text>
                </View>

                <View style={styles.otpBlock}>
                  <OtpValidator
                    label="Código"
                    otpLength={OTP_LENGTH}
                    stretch
                    onChange={(value) => {
                      setOtpCode(value);
                      if (otpError) setOtpError("");
                    }}
                  />
                  {otpError ? (
                    <Text
                      variant="caption"
                      color="error"
                      align="center"
                      style={styles.otpError}
                    >
                      {otpError}
                    </Text>
                  ) : null}
                </View>

                <Button
                  variant="dark"
                  title={isVerifying ? "Verificando..." : "Verificar correo"}
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
                      variant="caption"
                      color={
                        resendCountdown > 0 ? "stateAnulated" : "textDark"
                      }
                    >
                      {resendLabel}
                    </Text>
                  </Pressable>
                </View>

                <Text
                  variant="caption"
                  color="stateAnulated"
                  align="center"
                  style={styles.footerNote}
                >
                  Si no lo ves, revisa spam o promociones.
                </Text>
              </View>
            )}

            {isLoading ? (
              <View style={styles.loadingRow}>
                <Text variant="caption" color="stateAnulated" align="center">
                  Cargando configuración...
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            variant="caption"
            color="stateAnulated"
            align="center"
            style={styles.footerNote}
          >
            Podrás actualizarlo más adelante si lo necesitas.
          </Text>
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
