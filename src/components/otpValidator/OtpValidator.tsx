import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { createOtpValidatorStyles } from "./styles";

type OtpValidatorProps = {
  label: string;
  helperText?: string | null;
  otpLength?: number;
  stretch?: boolean;
  onChange?: (value: string) => void;
};

export default function OtpValidator({
  label,
  helperText,
  otpLength = 4,
  stretch = false,
  onChange,
}: OtpValidatorProps) {
  const t = useTheme();
  const s = useMemo(() => createOtpValidatorStyles(t), [t]);
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [values, setValues] = useState<string[]>(Array(otpLength).fill(""));

  const focus = (index: number) => inputsRef.current[index]?.focus();

  const emit = (nextValues: string[]) => {
    onChange?.(nextValues.join(""));
  };

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, "");
    const next = [...values];

    if (cleaned.length === 0) {
      next[index] = "";
      setValues(next);
      emit(next);
      return;
    }

    let cursor = index;
    for (const char of cleaned) {
      if (cursor >= otpLength) break;
      next[cursor] = char;
      cursor += 1;
    }

    setValues(next);
    emit(next);
    if (cursor < otpLength) focus(cursor);
    else inputsRef.current[otpLength - 1]?.blur();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key !== "Backspace") return;
    if (values[index] !== "") return;
    if (index <= 0) return;

    const next = [...values];
    next[index - 1] = "";
    setValues(next);
    emit(next);
    focus(index - 1);
  };

  return (
    <View style={s.container}>
      <View style={[s.inputRow, stretch ? s.inputRowStretch : null]}>
        {Array.from({ length: otpLength }).map((_, index) => (
          <Pressable
            key={index}
            style={[
              s.inputBox,
              stretch ? s.inputBoxStretch : null,
              focusedIndex === index ? s.inputBoxFocused : null,
            ]}
            onPress={() => focus(index)}
          >
            <TextInput
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              value={values[index]}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(event) =>
                handleKeyPress(event.nativeEvent.key, index)
              }
              onFocus={() => setFocusedIndex(index)}
              onBlur={() =>
                setFocusedIndex((prev) => (prev === index ? null : prev))
              }
              keyboardType="number-pad"
              maxLength={1}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              style={s.inputText}
            />
          </Pressable>
        ))}
      </View>
      {helperText ? (
        <Text variant="body" style={s.helperText}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
