import { defaultCountryCode } from "@/src/components/inputPhone/InputPhone";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { Tab, Tabs } from "@/src/components/tabs/Tab";
import { Text } from "@/src/components/Text";
import { signUpWithPhoneOtp, UserSignUpData, verifyPhoneOtp } from "@/src/lib/supabase/auth";
import { spacing } from "@/src/themes/spacing";
import { Link, router } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import CreateUserFormTab from "./signup/CreateUserFormTab";
import VerifyCode from "./signup/VerifyCode";

function Step1({ next, values, setValues }: any) {
  const createWithPhoneNumber = async () => {
    await signUpWithPhoneOtp(defaultCountryCode + values.phoneNumber);
    next();
  };

  const tabs: Tab[] = [
    {
      title: "Comprador",
      content: (
        <CreateUserFormTab
          values={values}
          setValues={setValues}
          onCreate={createWithPhoneNumber}
        />
      ),
    },
    {
      title: "Vendedor",
      content: <Text>Content 2</Text>,
    },
  ];
  return (
    <View>
      <Tabs tabs={tabs}></Tabs>
    </View>
  );
}

function Step2({ next, back, values }: any) {
  const onVerify = async (code : string) => {
    const authUser : UserSignUpData = {
      fullName: values.fullName,
      idDocument: values.idDocument,
    };
    await verifyPhoneOtp(defaultCountryCode + values.phoneNumber, code, authUser)
      .then(() => {
        next();
        return true;
      })
      .catch((err) => {
        console.log("Error verifying OTP:", err);
        return false;
      });
    return false;
  };

  return (
    <VerifyCode phoneNumber={values.phoneNumber} onVerify={onVerify} />
  );
}

export default function signup() {
  const ref = useRef<StepperRef>(null);

  const [values, setValues] = useState({
    fullName: "",
    idDocument: "",
    phoneNumber: "",
    bankAccount: "",
    ownerName: "",
  });

  const steps: Step[] = [
    {
      title: "Crear una cuenta",
      description: "Verificación de código",
      isNextStepShown: true,
      render: (api) => <Step1 {...api} values={values} setValues={setValues} />,
    },
    {
      title: "Verificación de código",
      description: "Ingresa el código enviado a tu teléfono",
      isNextStepShown: false,
      render: (api) => <Step2 {...api} values={values} />,
    },
  ];

  return (
    <View style={styles.container}>
      <Stepper
        steps={steps}
        ref={ref}
        onFinish={() => router.push("/(tabs)")}
        onBackAtFirstStep={() => router.back()}
      ></Stepper>
      <View style={styles.footer}>
        <Text variant="caption" align="center">
          Al ingresar tu número, aceptas automáticamente los
        </Text>
        <Link href="https://google.com">
          <Text
            variant="caption"
            style={{ textDecorationLine: "underline", fontWeight: "bold" }}
          >
            Términos y condiciones
          </Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    alignItems: "center",
  },
});