import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes/ThemeProvider";
import { showError } from "@/src/utils/useToast";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, Pressable, TextInput, View } from "react-native";
import { useStepperKeyboard } from "../stepper/StepperKeyboardContext";
import { normalizeOtpValue } from "./otp";
import { createOtpVerifierStyles } from "./styles";

type OtpVerifierProps = {
  phoneNumber: string;
  onVerify: (code: string) => Promise<boolean>;
  onResendCode: () => Promise<void>;
  onVerifyingChange?: (isVerifying: boolean) => void;
  otpLength?: number;
};

const otpLengthDefault = 6;
const isAndroid = Platform.OS === "android";
const resendIntervalSeconds = 30;

export const OtpVerifier = ({
  phoneNumber,
  onVerify,
  onResendCode,
  onVerifyingChange,
  otpLength = otpLengthDefault,
}: OtpVerifierProps) => {
  const t = useTheme();
  const s = useMemo(() => createOtpVerifierStyles(t), [t]);
  const stepperKeyboard = useStepperKeyboard();

  const maskPhone = (phone: string) => {
    return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
  };

  const [values, setValues] = useState<string[]>(() =>
    Array(otpLength).fill("")
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const [isActive, setIsActive] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  const [remainingTime, setRemainingTime] = useState<number>(
    resendIntervalSeconds
  );

  const inputRef = useRef<TextInput | null>(null);
  const isVerifyingRef = useRef(false);
  const focusMayBeStaleRef = useRef(false);
  const refocusFrameRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const isResendingRef = useRef(false);
  const isMountedRef = useRef(true);

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    stopCountdown();
    setIsActive(false);
    setRemainingTime(resendIntervalSeconds);
    countdownIntervalRef.current = setInterval(() => {
      setRemainingTime((time) => {
        if (time <= 1) {
          stopCountdown();
          setIsActive(true);
          return 0;
        }
        return time - 1;
      });
    }, 1000);
  }, [stopCountdown]);

  useEffect(() => {
    isMountedRef.current = true;
    startCountdown();
    return () => {
      isMountedRef.current = false;
      stopCountdown();
    };
  }, [startCountdown, stopCountdown]);

  useEffect(() => {
    if (!isAndroid) return;

    const markFocusAsStale = () => {
      if (refocusFrameRef.current !== null) {
        cancelAnimationFrame(refocusFrameRef.current);
        refocusFrameRef.current = null;
      }
      focusMayBeStaleRef.current = true;
      setFocusedIndex(null);
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState !== "active") markFocusAsStale();
      }
    );
    const blurSubscription = AppState.addEventListener(
      "blur",
      markFocusAsStale
    );

    return () => {
      appStateSubscription.remove();
      blurSubscription.remove();
      if (refocusFrameRef.current !== null) {
        cancelAnimationFrame(refocusFrameRef.current);
      }
    };
  }, []);

  const focus = () => {
    const input = inputRef.current;
    if (!input) return;

    if (!isAndroid || !focusMayBeStaleRef.current) {
      input.focus();
      return;
    }

    focusMayBeStaleRef.current = false;
    input.blur();
    refocusFrameRef.current = requestAnimationFrame(() => {
      refocusFrameRef.current = null;
      inputRef.current?.focus();
    });
  };
  const blur = () => inputRef.current?.blur();

  const maybeComplete = async (nextValues: string[]) => {
    if (isVerifyingRef.current || !nextValues.every((c) => c !== "")) return;

    isVerifyingRef.current = true;
    setIsVerifying(true);
    onVerifyingChange?.(true);

    try {
      const success = await onVerify(nextValues.join(""));
      if (!isMountedRef.current) return;
      setIsValid(success);
      if (!success) {
        setHasError(true);
      }
    } finally {
      isVerifyingRef.current = false;
      if (isMountedRef.current) {
        setIsVerifying(false);
        onVerifyingChange?.(false);
      }
    }
  };

  const handleChange = (text: string) => {
    if (isValid || isVerifying) return;
    setHasError(false);
    const cleaned = normalizeOtpValue(text, otpLength);
    const next = Array.from(
      { length: otpLength },
      (_, index) => cleaned[index] ?? ""
    );
    setValues(next);
    setFocusedIndex(Math.min(cleaned.length, otpLength - 1));

    if (cleaned.length === otpLength) blur();

    void maybeComplete(next);
  };

  const pasteCode = async () => {
    if (isValid || isVerifying) return;

    try {
      const clipboardValue = await Clipboard.getStringAsync();
      const cleaned = normalizeOtpValue(clipboardValue, otpLength);
      if (!cleaned) return;

      handleChange(cleaned);
      if (cleaned.length < otpLength) focus();
    } catch {
      showError("No se pudo pegar el código", "Intenta nuevamente.");
    }
  };

  const resendCode = async () => {
    if (!isActive || isResendingRef.current) return;
    isResendingRef.current = true;
    setIsResending(true);
    setIsActive(false);
    try {
      await onResendCode();
      if (!isMountedRef.current) return;
      setValues(Array(otpLength).fill(""));
      setFocusedIndex(0);
      setHasError(false);
      setIsValid(false);
      focus();
    } catch (err) {
      if (isMountedRef.current) {
        showError(
          err instanceof Error ? err.message : "No se pudo reenviar el código."
        );
      }
    } finally {
      isResendingRef.current = false;
      if (isMountedRef.current) {
        setIsResending(false);
        startCountdown();
      }
    }
  };

  return (
    <View>
      <View style={s.label}>
        <Text variant="body" color="stateAnulated">
          Se ha enviado un código a {maskPhone(phoneNumber)}
        </Text>
      </View>
      <Pressable
        style={s.otpCodeContainer}
        onPress={isAndroid ? undefined : focus}
        disabled={isValid || isVerifying}
        accessible={isAndroid ? false : undefined}
        importantForAccessibility={isAndroid ? "no" : undefined}
      >
        <TextInput
          ref={inputRef}
          value={values.join("")}
          onChangeText={handleChange}
          onPressIn={isAndroid ? focus : undefined}
          onFocus={(event) => {
            stepperKeyboard?.scrollToFocusedInput(event.target);
            setFocusedIndex(Math.min(values.join("").length, otpLength - 1));
          }}
          onBlur={() => setFocusedIndex(null)}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={otpLength}
          editable={!isValid && !isVerifying}
          textContentType={isAndroid ? undefined : "oneTimeCode"}
          autoComplete={isAndroid ? "sms-otp" : "one-time-code"}
          importantForAutofill={isAndroid ? "yes" : undefined}
          accessibilityLabel={
            isAndroid
              ? `Código de verificación de ${otpLength} dígitos`
              : undefined
          }
          accessibilityHint={
            isAndroid
              ? "Ingresa el código recibido por mensaje de texto"
              : undefined
          }
          caretHidden
          selectionColor={isAndroid ? "transparent" : undefined}
          underlineColorAndroid="transparent"
          style={s.otpHiddenInput}
        />
        {Array.from({ length: otpLength }).map((_, index) => (
          <View
            key={index}
            accessible={isAndroid ? false : undefined}
            importantForAccessibility={
              isAndroid ? "no-hide-descendants" : undefined
            }
            pointerEvents={isAndroid ? "none" : undefined}
            style={[
              s.otpCodeInputContainer,
              focusedIndex === index
                ? s.otpCodeInputContainerFocused
                : undefined,
              hasError ? s.inputState.error : undefined,
              isValid ? s.inputState.success : undefined,
            ]}
          >
            {values[index] ? (
              <Text style={s.otpCodeInput}>{values[index]}</Text>
            ) : focusedIndex === index ? (
              <View style={s.otpCaret} />
            ) : null}
          </View>
        ))}
      </Pressable>
      {isAndroid && !isValid && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pegar código"
          accessibilityHint="Pega el código de verificación desde el portapapeles"
          accessibilityState={{ disabled: isVerifying }}
          disabled={isVerifying}
          onPress={() => void pasteCode()}
          style={({ pressed }) => [
            s.pasteCodeButton,
            pressed && !isVerifying ? { opacity: 0.6 } : undefined,
          ]}
        >
          <Text
            style={{ textDecorationLine: "underline" }}
            color={isVerifying ? "stateAnulated" : "textDark"}
          >
            Pegar código
          </Text>
        </Pressable>
      )}
      {Boolean(hasError) && (
        <View
          style={s.errorView}
          accessibilityLiveRegion={isAndroid ? "polite" : undefined}
        >
          <Text color="error">
            Código inválido. Por favor, inténtalo de nuevo.
          </Text>
        </View>
      )}
      <View style={s.resendCodeView}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !isActive || isResending }}
          disabled={!isActive || isResending}
          onPress={resendCode}
        >
          <Text
            style={{ textDecorationLine: "underline" }}
            color={isActive && !isResending ? "textDark" : "stateAnulated"}
          >
            Reenviar código
          </Text>
        </Pressable>
        {Boolean(!isActive) && (
          <Text color="textDark" style={{ marginLeft: t.spacing.sm }}>
            ({remainingTime}s)
          </Text>
        )}
      </View>
    </View>
  );
};
