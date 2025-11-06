import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { Tab, Tabs } from "@/src/components/tabs/Tab";
import { router } from "expo-router";
import React, { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

function Step1({ next }: any) {

  const tabs : Tab[] = [
    {
      title: "Tab 1",
      content: <Text>Content 1</Text>,
    },
    {
      title: "Tab 2",
      content: <Text>Content 2</Text>,
    }
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "flex-start"
  }
});