import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import { InputPhone } from "@/src/components/inputPhone/InputPhone";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { Tab, Tabs } from "@/src/components/tabs/Tab";
import { Text } from "@/src/components/Text";
import { spacing } from "@/src/themes/spacing";
import { Link, router } from "expo-router";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";

function Step1({ next }: any) {
  const createWithPhoneNumber = () => {
    console.log("next");
    next();
  };

  const tabs: Tab[] = [
    {
      title: "Comprador",
      content: (
        <View>
          <TextField label="Nombre completo"></TextField>
          <TextField label="Documento de identificación personal"></TextField>
          <InputPhone label="Teléfono celular"></InputPhone>
            <Button
              variant="dark"
              onPress={() => createWithPhoneNumber()}
              title="Siguiente"
            ></Button>
        </View>
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

function Step2({ next, back }: any) {
  return (
    <View>
      <Text>Step 1</Text>
    </View>
  );
}

export default function signup() {
  const ref = useRef<StepperRef>(null);

  const steps: Step[] = [
    {
      title: "Crear una cuenta",
      description: "Verificación de código",
      isNextStepShown: true,
      render: (api) => <Step1 {...api} />,
    },
    {
      title: "Verificación de código",
      description: "Completar perfil",
      isNextStepShown: false,
      render: (api) => <Step2 {...api} />,
    },
  ];

  return (
    <View style={styles.container}>
      <Stepper
        steps={steps}
        ref={ref}
        onFinish={() => console.log("hola")}
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
