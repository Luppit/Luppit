import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes/ThemeProvider";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
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

  useEffect(() => {
    startCountdown();
  }, []);

  const maskPhone = (phone: string) => {
    return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
  };

  const [values, setValues] = useState<string[]>(() =>
    Array(otpLength).fill("")
  );

  const [isActive, setIsActive] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);

  const INTERLVAL_TIME = 30;
  const [remainingTime, setRemainingTime] = useState<number>(INTERLVAL_TIME);

  const inputsRef = useRef<Array<TextInput | null>>([]);

  const focus = (i: number) => inputsRef.current[i]?.focus();
  const blur = (i: number) => inputsRef.current[i]?.blur();

  const maybeComplete = async (nextValues: string[]) => {
    if (nextValues.every((c) => c !== "")) {
      const otp = nextValues.join("");
      const success = await onVerify(otp);
      setIsValid(success);
      if (!success) {
        setHasError(true);
      }
    }
  };

  const handleChange = (text: string, i: number) => {
    if (isValid) return;
    setHasError(false);
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length === 0) {
      const next = [...values];
      next[i] = "";
      setValues(next);
      return;
    }

    const next = [...values];
    let idx = i;
    for (const ch of cleaned) {
      if (idx >= otpLength) break;
      next[idx] = ch;
      idx++;
    }
    setValues(next);

    if (idx < otpLength) focus(idx);
    else blur(otpLength - 1);

    void maybeComplete(next);
  };

  const handleKeyPress = (e: any, i: number) => {
    if (isValid) return;
    if (e.nativeEvent.key !== "Backspace") return;
    if (values[i] === "" && i > 0) {
      const next = [...values];
      next[i - 1] = "";
      setValues(next);
      focus(i - 1);
    }
  };

  const handleFocus = (i: number) => {
    if (isValid) return;
    if (!values[i]) return;
    const next = [...values];
    next[i] = "";
    setValues(next);
  };

  const resendCode = async () => {
    if (!isActive) return;
    setIsActive(false);
    await onResendCode();
    startCountdown();
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
      <View style={s.otpCodeContainer}>
        {Array.from({ length: otpLength }).map((_, index) => (
          <View key={index} style={[s.otpCodeInputContainer, 
            hasError ? s.inputState.error : undefined,
            isValid ? s.inputState.success : undefined
          ]}>
            <TextInput
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              style={
                s.otpCodeInput
              }
              value={values[index]}
              onChangeText={(txt) => handleChange(txt, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => handleFocus(index)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!isValid}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              returnKeyType={index === otpLength - 1 ? "done" : "next"}
            />
          </View>
        ))}
      </View>
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
