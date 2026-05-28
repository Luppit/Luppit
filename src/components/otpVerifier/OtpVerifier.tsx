import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes/ThemeProvider";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { useStepperKeyboard } from "../stepper/StepperKeyboardContext";
import { createOtpVerifierStyles } from "./styles";

type OtpVerifierProps = {
  phoneNumber: string;
  onVerify: (code: string) => Promise<boolean>;
  onResendCode: () => Promise<void>;
  otpLength?: number;
};

const otpLengthDefault = 6;

export const OtpVerifier = ({
  phoneNumber,
  onVerify,
  onResendCode,
  otpLength = otpLengthDefault,
}: OtpVerifierProps) => {
  const t = useTheme();
  const s = useMemo(() => createOtpVerifierStyles(t), [t]);
  const stepperKeyboard = useStepperKeyboard();

  useEffect(() => {
    startCountdown();
  }, []);

  const maskPhone = (phone: string) => {
    return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
  };

  const [values, setValues] = useState<string[]>(() =>
    Array(otpLength).fill("")
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const [isActive, setIsActive] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const INTERLVAL_TIME = 30;
  const [remainingTime, setRemainingTime] = useState<number>(INTERLVAL_TIME);

  const inputRef = useRef<TextInput | null>(null);
  const isVerifyingRef = useRef(false);

  const focus = () => inputRef.current?.focus();
  const blur = () => inputRef.current?.blur();

  const maybeComplete = async (nextValues: string[]) => {
    if (isVerifyingRef.current || !nextValues.every((c) => c !== "")) return;

    isVerifyingRef.current = true;
    setIsVerifying(true);

    try {
      const success = await onVerify(nextValues.join(""));
      setIsValid(success);
      if (!success) {
        setHasError(true);
      }
    } finally {
      isVerifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleChange = (text: string) => {
    if (isValid || isVerifying) return;
    setHasError(false);
    const cleaned = text.replace(/\D/g, "").slice(0, otpLength);
    const next = Array.from(
      { length: otpLength },
      (_, index) => cleaned[index] ?? ""
    );
    setValues(next);
    setFocusedIndex(Math.min(cleaned.length, otpLength - 1));

    if (cleaned.length === otpLength) blur();

    void maybeComplete(next);
  };

  const resendCode = async () => {
    if (!isActive) return;
    setIsActive(false);
    await onResendCode();
    setValues(Array(otpLength).fill(""));
    setFocusedIndex(0);
    setHasError(false);
    setIsValid(false);
    startCountdown();
    focus();
  };

  const startCountdown = () => {
    setIsActive(false);
    setRemainingTime(INTERLVAL_TIME);
    const interval = setInterval(() => {
      setRemainingTime((time) => {
        if (time <= 1) {
          clearInterval(interval);
          setIsActive(true);
          return INTERLVAL_TIME;
        }
        return time - 1;
      });
    }, 1000);
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
        onPress={focus}
        disabled={isValid || isVerifying}
      >
        <TextInput
          ref={inputRef}
          value={values.join("")}
          onChangeText={handleChange}
          onFocus={(event) => {
            stepperKeyboard?.scrollToFocusedInput(event.target);
            setFocusedIndex(Math.min(values.join("").length, otpLength - 1));
          }}
          onBlur={() => setFocusedIndex(null)}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={otpLength}
          editable={!isValid && !isVerifying}
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
          importantForAutofill="yes"
          caretHidden
          style={s.otpHiddenInput}
        />
        {Array.from({ length: otpLength }).map((_, index) => (
          <View
            key={index}
            style={[
              s.otpCodeInputContainer,
              focusedIndex === index
                ? s.otpCodeInputContainerFocused
                : undefined,
              hasError ? s.inputState.error : undefined,
              isValid ? s.inputState.success : undefined,
            ]}
          >
            <Text style={s.otpCodeInput}>{values[index]}</Text>
          </View>
        ))}
      </Pressable>
      {Boolean(hasError) && (
        <View style={s.errorView}>
          <Text color="error">
            Código inválido. Por favor, inténtalo de nuevo.
          </Text>
        </View>
      )}
      <View style={s.resendCodeView}>
        <Pressable onPress={resendCode}>
          <Text
            style={{ textDecorationLine: "underline" }}
            color={isActive ? "textDark" : "stateAnulated"}
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
