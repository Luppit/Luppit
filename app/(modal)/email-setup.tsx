import { goBackOrHome } from "@/src/utils/useAndroidBackAction";
import { useAndroidLeaveGuard } from "@/src/utils/useAndroidLeaveGuard";
import Button from "@/src/components/button/Button";
import { GroupedListRow, GroupedListSection } from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import LoadingState from "@/src/components/loading/LoadingState";
import OtpValidator from "@/src/components/otpValidator/OtpValidator";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Text } from "@/src/components/Text";
import {
  getCurrentProfileEmailSetupStatus,
  getCurrentProfileVerifiedEmailOptions,
  requestCurrentProfileEmailSetupVerification,
  resendCurrentProfileEmailSetupVerification,
  reuseCurrentProfileVerifiedEmail,
  verifyCurrentProfileEmailSetup,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import {
  showError,
  showMissingFields,
  showSuccess,
} from "@/src/utils/useToast";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const { activeProfile } = useActiveProfile();
  const isSeller = activeProfile?.role === "seller";
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
  const [initialEmail, setInitialEmail] = useState("");
  const [initialOptIn, setInitialOptIn] = useState(false);
  const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);
  const [showEmailEntry, setShowEmailEntry] = useState(true);
  const sendInFlight = useRef(false);
  const allowNavigation = useAndroidLeaveGuard(
    !isLoading && (normalizeEmail(email) !== normalizeEmail(initialEmail) ||
      emailOptIn !== initialOptIn || step === "otp"),
    isSendingCode || isVerifying
  );

  useEffect(() => {
    let active = true;

    const loadEmailSetup = async () => {
      setIsLoading(true);
      const [result, options] = await Promise.all([
        getCurrentProfileEmailSetupStatus(),
        getCurrentProfileVerifiedEmailOptions().catch(() => null),
      ]);
      if (!active) return;

      if (!result.ok) {
        showError("No se pudo cargar la configuración", result.error.message);
        setIsLoading(false);
        return;
      }

      const reusableEmails = options?.ok ? options.data : [];
      const initialValue = result.data.email ?? reusableEmails[0] ?? "";
      setVerifiedEmails(reusableEmails);
      setShowEmailEntry(!reusableEmails.includes(normalizeEmail(initialValue)));
      setInitialEmail(initialValue);
      setInitialOptIn(result.data.emailOptIn);
      setEmail(initialValue);
      setEmailOptIn(result.data.emailOptIn);
      setIsLoading(false);
    };

    void loadEmailSetup();

    return () => {
      active = false;
    };
  }, [activeProfile?.profile.id]);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timeout = setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [resendCountdown]);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const reusesVerifiedEmail = verifiedEmails.includes(normalizedEmail);
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
    if (!canAttemptSendCode || sendInFlight.current) return;
    setDidTryEmailSubmit(true);
    setEmailServerError("");
    const missingFields: string[] = [];
    if (!normalizedEmail) missingFields.push("correo electrónico");
    if (!emailOptIn) missingFields.push("aceptación para recibir correos");
    showMissingFields(missingFields);
    if (missingFields.length > 0 || !isEmailValid) return;

    sendInFlight.current = true;
    setIsSendingCode(true);
    let result;
    try {
      result = reusesVerifiedEmail
        ? await reuseCurrentProfileVerifiedEmail({ email: normalizedEmail, emailOptIn })
        : await requestCurrentProfileEmailSetupVerification({ email: normalizedEmail });
    } catch {
      showError(reusesVerifiedEmail ? "No se pudo guardar el correo" : "No se pudo enviar el código");
      return;
    } finally {
      sendInFlight.current = false;
      setIsSendingCode(false);
    }

    if (!result.ok) {
      if (result.error.code === "email_already_in_use") {
        setShowEmailEntry(true);
        setEmailServerError(result.error.message);
        return;
      }
      if (result.error.code === "email_not_verified_for_account") {
        setVerifiedEmails((current) => current.filter((address) => address !== normalizedEmail));
        setShowEmailEntry(true);
        setEmailServerError(result.error.message);
        return;
      }
      showError(reusesVerifiedEmail ? "No se pudo guardar el correo" : "No se pudo enviar el código", result.error.message);
      return;
    }

    if (reusesVerifiedEmail) {
      showSuccess("Correo guardado");
      allowNavigation(goBackOrHome);
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
    allowNavigation(goBackOrHome);
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
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>{isLoading ? (
          <LoadingState
            label="Cargando configuración..."
            variant="inline"
            style={styles.loadingState}
          />
        ) : step === "email" ? (
          <View style={styles.stepContent}>
            <View style={styles.intro}>
              <Text variant="subtitle" accessibilityRole="header">
                {isSeller ? "Configurá el correo de tu negocio" : "Configurá tu correo"}
              </Text>
              <Text variant="body" color="textMedium">
                {isSeller
                  ? "Aquí recibirás los avisos del negocio."
                  : "Aquí recibirás códigos, confirmaciones y avisos importantes."}
              </Text>
            </View>

            {verifiedEmails.length > 0 ? (
              <GroupedListSection title="Correos verificados en tu cuenta">
                {verifiedEmails.map((address) => {
                  const selected = !showEmailEntry && normalizedEmail === address;
                  return (
                    <GroupedListRow
                      key={address}
                      icon={selected ? "check" : "mail"}
                      label={address}
                      labelMaxLines={2}
                      accessibilityLabel={`${address}${selected ? ", seleccionado" : ""}`}
                      showChevron={false}
                      onPress={canAttemptSendCode ? () => {
                        setEmail(address);
                        setEmailServerError("");
                        setShowEmailEntry(false);
                      } : undefined}
                    />
                  );
                })}
                <GroupedListRow
                  icon="plus"
                  label={isSeller ? "Verificar otro correo del negocio" : "Verificar otro correo"}
                  labelMaxLines={2}
                  showSeparator={false}
                  onPress={canAttemptSendCode ? () => {
                    if (!showEmailEntry) setEmail("");
                    setEmailServerError("");
                    setShowEmailEntry(true);
                  } : undefined}
                />
              </GroupedListSection>
            ) : null}

            {showEmailEntry ? <GroupedListSection title="Datos de contacto">
              <View style={styles.formContent}>
                <Text variant="body">Correo electrónico</Text>
                <TextField
                  accessibilityLabel="Correo electrónico"
                  accessibilityHint={
                    emailError ||
                    "Ingresa la dirección que quieres verificar."
                  }
                  value={email}
                  editable={canAttemptSendCode}
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
            </GroupedListSection> : null}

            <GroupedListSection title="Preferencias de correo">
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: emailOptIn, disabled: !canAttemptSendCode }}
                accessibilityHint="Necesario para recibir códigos, confirmaciones y avisos de entrega"
                disabled={!canAttemptSendCode}
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
              title={reusesVerifiedEmail ? "Usar este correo" : "Enviar código"}
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
        )}</View>
      </TouchableWithoutFeedback>
    </ScrollView>
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
