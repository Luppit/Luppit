import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import { InputPhone } from "@/src/components/inputPhone/InputPhone";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { Tab, Tabs } from "@/src/components/tabs/Tab";
import { Text } from "@/src/components/Text";
import { spacing } from "@/src/themes/spacing";
import { Link, router } from "expo-router";
import React, { useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

function Step1({ next }: any) {
  const [values, setValues] = useState({
    fullName: "",
    idDocument: "",
    phoneNumber: "",
  });

  const [errors, setErrors] = useState({
    fullName: "",
    idDocument: "",
    phoneNumber: "",
  });

  const validateFields = () => {
    const newErrors: Record<string, string> = {};
    if (!values.fullName.trim())
      newErrors.fullName = "El nombre completo es obligatorio.";
    if (!values.idDocument.trim())
      newErrors.idDocument = "El documento de identificación es obligatorio.";
    if (!values.phoneNumber.trim())
      newErrors.phoneNumber = "El teléfono celular es obligatorio.";

    if (values.phoneNumber && !!/^[0-9]{8}$/.test(values.phoneNumber)) {
      newErrors.phoneNumber = "El teléfono celular debe tener 8 dígitos.";
    }

    setErrors(newErrors as any);
    return Object.keys(newErrors).length === 0;
  };

  const createWithPhoneNumber = () => {
    if (!validateFields()) {
      Alert.alert("Por favor corrige los errores antes de continuar.");
      return;
    }
    next();
  };

  const tabs: Tab[] = [
    {
      title: "Comprador",
      content: (
        <View>
          <TextField
            label="Nombre completo"
            value={values.fullName}
            onChangeText={(text) => {
              setValues({ ...values, fullName: text });
              if (errors.fullName && text.trim()) {
                setErrors({ ...errors, fullName: "" });
              }
            }}
            hasError={!!errors.fullName}
            error={errors.fullName}
          />
          <TextField
            label="Documento de identificación personal"
            value={values.idDocument}
            onChangeText={(text) => {
              setValues({ ...values, idDocument: text });
              if (errors.idDocument && text.trim()) {
                setErrors({ ...errors, idDocument: "" });
              }
            }}
            hasError={!!errors.idDocument}
            error={errors.idDocument}
          />
          <InputPhone
            label="Teléfono celular"
            value={values.phoneNumber}
            onChangeText={(text) => {
              setValues({ ...values, phoneNumber: text });
              if (errors.phoneNumber && /^[0-9]{8}$/.test(text)) {
                setErrors({ ...errors, phoneNumber: "" });
              }
            }}
            hasError={!!errors.phoneNumber}
            error={errors.phoneNumber}
          />
          <Button
            variant="dark"
            onPress={() => createWithPhoneNumber()}
            title="Siguiente"
          />
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
