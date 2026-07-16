import Button from "@/src/components/button/Button";
import {
  defaultCountryCode,
  InputPhone,
} from "@/src/components/inputPhone/InputPhone";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { signInWithPhoneOtp, verifyPhoneOtp } from "@/src/lib/supabase";
import { showError } from "@/src/utils";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import VerifyCode from "./signup/VerifyCode";

const PHONE_REGEX = /^(?![0-9]{8}$)/;

export function Step1({ next, values, setValues }: any) {
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

  const [values, setValues] = useState({
    phoneNumber: "",
  });

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
    [values]
  );

  return (
    <View style={styles.container}>
      <Stepper
        steps={steps}
        ref={stepperRef}
        onFinish={() => router.replace("/(tabs)")}
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
