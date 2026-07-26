import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useMemo, useRef, useState } from "react";
import { Platform, Pressable, TextInput, TextInputProps, View } from "react-native";
import { useStepperKeyboard } from "../stepper/StepperKeyboardContext";
import { createOtpValidatorStyles } from "./styles";

type OtpValidatorProps = {
  label: string;
  accessibilityLabel?: string;
  helperText?: string | null;
  errorText?: string | null;
  otpLength?: number;
  stretch?: boolean;
  onChange?: (value: string) => void;
  onFocus?: TextInputProps["onFocus"];
  onHelperPress?: () => void;
};

export default function OtpValidator({
  label,
  accessibilityLabel,
  helperText,
  errorText,
  otpLength = 4,
  stretch = false,
  onChange,
  onFocus,
  onHelperPress,
}: OtpValidatorProps) {
  const t = useTheme();
  const s = useMemo(() => createOtpValidatorStyles(t), [t]);
  const stepperKeyboard = useStepperKeyboard();
  const inputRef = useRef<TextInput | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [value, setValue] = useState("");

  const values = Array.from(
    { length: otpLength },
    (_, index) => value[index] ?? ""
  );

  const focus = () => inputRef.current?.focus();
  const inputAccessibilityLabel = accessibilityLabel ?? label;

  const emit = (nextValue: string) => {
    onChange?.(nextValue);
  };

  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, otpLength);
    setValue(cleaned);
    emit(cleaned);
    setFocusedIndex(Math.min(cleaned.length, otpLength - 1));

    if (cleaned.length === otpLength) inputRef.current?.blur();
  };

  return (
    <View style={s.container}>
      {label.trim() ? (
        <Text variant="body" style={s.label}>
          {label}
        </Text>
      ) : null}
      <Pressable
        style={[s.inputRow, stretch ? s.inputRowStretch : null]}
        onPress={focus}
        accessibilityLabel={inputAccessibilityLabel}
        accessibilityHint={errorText ?? undefined}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={inputAccessibilityLabel}
          value={value}
          onChangeText={handleChange}
          onFocus={(event) => {
            stepperKeyboard?.scrollToFocusedInput(event.target);
            onFocus?.(event);
            setFocusedIndex(Math.min(value.length, otpLength - 1));
          }}
          onBlur={() => setFocusedIndex(null)}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={otpLength}
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
          importantForAutofill="yes"
          caretHidden
          style={s.hiddenInput}
        />
        {Array.from({ length: otpLength }).map((_, index) => (
          <View
            key={index}
            style={[
              s.inputBox,
              stretch ? s.inputBoxStretch : null,
              focusedIndex === index ? s.inputBoxFocused : null,
              errorText ? s.inputBoxError : null,
            ]}
          >
            {values[index] ? (
              <Text style={s.inputText}>{values[index]}</Text>
            ) : focusedIndex === index ? (
              <View style={s.inputCaret} />
            ) : null}
          </View>
        ))}
      </Pressable>
      {errorText ? (
        <Text variant="small" style={s.errorText} accessibilityRole="alert">
          {errorText}
        </Text>
      ) : null}
      {helperText && onHelperPress ? (
        <Pressable
          onPress={onHelperPress}
          style={s.helperButton}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text variant="body" style={s.helperText}>
            {helperText}
          </Text>
        </Pressable>
      ) : helperText ? (
        <Text variant="body" style={s.helperText}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
