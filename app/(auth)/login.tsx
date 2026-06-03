import Button from "@/src/components/button/Button";
import {
  defaultCountryCode,
  InputPhone,
} from "@/src/components/inputPhone/InputPhone";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { signInWithPhoneOtp, verifyPhoneOtp } from "@/src/lib/supabase";
import { getSession } from "@/src/lib/supabase/auth";
import { getCurrentProfileUnreadNotificationCount } from "@/src/services/notification.service";
import { clearPendingProfileSwitch } from "@/src/services/profile.switch.service";
import { getProfileByUserId } from "@/src/services/profile.service";
import { saveProfilePayload } from "@/src/services/saved.profile.service";
import { showError } from "@/src/utils";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import VerifyCode from "./signup/VerifyCode";

const PHONE_REGEX = /^(?![0-9]{8}$)/;

function normalizeRoutePhone(phone: string | string[] | undefined) {
  const rawPhone = Array.isArray(phone) ? phone[0] : phone;
  if (!rawPhone) return "";

  const digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("506") && digits.length > 8) return digits.slice(3);
  return digits.slice(-8);
}

export function Step1({ next, values, setValues, autoSendOtp }: any) {
  const autoSentPhoneRef = useRef("");

  const [errors, setErrors] = useState({
    phoneNumber: "",
  });

  const validateFields = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!values.phoneNumber.trim()) {
      newErrors.phoneNumber = "El teléfono celular es obligatorio.";
    }
    if (!!PHONE_REGEX.test(values.phoneNumber)) {
      newErrors.phoneNumber = "El teléfono celular debe tener 8 dígitos.";
    }
    setErrors(newErrors as any);
    return Object.keys(newErrors).length === 0;
  }, [values.phoneNumber]);

  const sendOtp = useCallback(async () => {
    if (!validateFields()) return;
    try {
      await signInWithPhoneOtp(defaultCountryCode + values.phoneNumber);
      next();
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo enviar el código.");
    }
  }, [next, validateFields, values.phoneNumber]);

  useEffect(() => {
    const phoneNumber = values.phoneNumber.trim();
    if (!autoSendOtp || !phoneNumber || autoSentPhoneRef.current === phoneNumber) return;

    autoSentPhoneRef.current = phoneNumber;
    void sendOtp();
  }, [autoSendOtp, sendOtp, values.phoneNumber]);

  return (
    <View>
      <InputPhone
        value={values.phoneNumber}
        label="Número de teléfono"
        keyboardType="phone-pad"
        onChangeText={(text) => {
          setValues({ ...values, phoneNumber: text });
          if (errors.phoneNumber && !PHONE_REGEX.test(text)) {
            setErrors({ ...errors, phoneNumber: "" });
          }
        }}
        hasError={!!errors.phoneNumber}
        error={errors.phoneNumber}
      ></InputPhone>
      <Button variant="dark" onPress={() => sendOtp()} title="Siguiente" />
    </View>
  );
}

export function Step2({ next, back, values }: any) {
  const onVerify = async (code: string) => {
    return await verifyPhoneOtp(defaultCountryCode + values.phoneNumber, code)
      .then(async () => {
        const session = await getSession();
        const userId = session?.user.id;
        try {
          if (userId) {
            const profileResult = await getProfileByUserId(userId);
            if (profileResult?.ok === true) {
              const unreadResult = await getCurrentProfileUnreadNotificationCount();
              await saveProfilePayload(
                profileResult.data,
                unreadResult.ok ? unreadResult.data : undefined
              );
            }
          }
        } catch {
          // Local profile snapshots are only used for the switcher.
        }
        next();
        return true;
      })
      .catch((err) => {
        showError(err.message);
        return false;
      });
  };

  const onResend = async () => {
    await signInWithPhoneOtp(defaultCountryCode + values.phoneNumber).catch(
      (err) => {
        showError(err.message);
      }
    );
  };

  return (
    <VerifyCode
      phoneNumber={values.phoneNumber}
      onVerify={onVerify}
      onResend={onResend}
    />
  );
}

export default function Login() {
  const stepperRef = useRef<StepperRef>(null);
  const params = useLocalSearchParams<{
    phone?: string;
    autoSendOtp?: string;
  }>();

  const [values, setValues] = useState({
    phoneNumber: normalizeRoutePhone(params.phone),
  });
  const autoSendOtp = params.autoSendOtp === "true";

  useEffect(() => {
    const phoneNumber = normalizeRoutePhone(params.phone);
    if (!phoneNumber) return;

    if (autoSendOtp) {
      clearPendingProfileSwitch();
    }

    setValues((current) => {
      if (current.phoneNumber === phoneNumber) return current;
      return { ...current, phoneNumber };
    });
  }, [autoSendOtp, params.phone]);

  const steps: Step[] = React.useMemo(
    () => [
      {
        title: "Ingresa tu número de teléfono",
        description: "Te enviaremos un código de verificación",
        isNextStepShown: true,
        render: (api) => (
          <Step1
            {...api}
            values={values}
            setValues={setValues}
            autoSendOtp={autoSendOtp}
          />
        ),
      },
      {
        title: "Verificación de código",
        description: "Ingresa el código enviado a tu teléfono",
        isNextStepShown: false,
        render: (api) => <Step2 {...api} values={values} />,
      },
    ],
    [autoSendOtp, values]
  );

  return (
    <View style={styles.container}>
      <Stepper
        steps={steps}
        ref={stepperRef}
        onFinish={() => router.push("/(tabs)")}
        onBackAtFirstStep={() => router.back()}
      ></Stepper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
});
