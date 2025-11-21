import Button from "@/src/components/button/Button";
import {
  defaultCountryCode,
  InputPhone,
} from "@/src/components/inputPhone/InputPhone";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { signInWithPhoneOtp, verifyPhoneOtp } from "@/src/lib/supabase";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import VerifyCode from "./signup/VerifyCode";

export function Step1({ next, values, setValues }: any) {
  const phoneRegex = /^(?![0-9]{8}$)/;

  const [errors, setErrors] = useState({
    phoneNumber: "",
  });

  const validateFields = () => {
    const newErrors: Record<string, string> = {};
    if (!values.phoneNumber.trim()) {
      newErrors.phoneNumber = "El teléfono celular es obligatorio.";
    }
    if (!!phoneRegex.test(values.phoneNumber)) {
      newErrors.phoneNumber = "El teléfono celular debe tener 8 dígitos.";
    }
    setErrors(newErrors as any);
    return Object.keys(newErrors).length === 0;
  };

  const sendOtp = async () => {
    if (!validateFields()) return;
    await signInWithPhoneOtp(defaultCountryCode + values.phoneNumber);
    next();
  };

  return (
    <View>
      <InputPhone
        value={values.phoneNumber}
        label="Número de teléfono"
        keyboardType="phone-pad"
        onChangeText={(text) => {
          setValues({ ...values, phoneNumber: text });
          if (errors.phoneNumber && phoneRegex.test(text)) {
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
    await verifyPhoneOtp(defaultCountryCode + values.phoneNumber, code)
      .then(() => {
        next();
        return true;
      })
      .catch((err) => {
        return false;
      });
    return false;
  };

  const onResend = async () => {
    await signInWithPhoneOtp(defaultCountryCode + values.phoneNumber);
  };

  return (
    <VerifyCode
      phoneNumber={values.phoneNumber}
      onVerify={onVerify}
      onResend={onResend}
    />
  );
}

export default function login() {
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
          <Step1 {...api} values={values} setValues={setValues} />
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
