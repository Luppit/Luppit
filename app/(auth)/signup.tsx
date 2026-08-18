import { defaultCountryCode } from "@/src/components/inputPhone/InputPhone";
import { Icon } from "@/src/components/Icon";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { Tab, Tabs } from "@/src/components/tabs/Tab";
import { Text } from "@/src/components/Text";
import {
  signUpWithPhoneOtp,
  verifyBuyerPhoneOtp,
  verifySellerPhoneOtp,
} from "@/src/lib/supabase/auth";
import { LEGAL_DOCUMENT_CODES } from "@/src/services/legal-document.service";
import { borders, colors, spacing } from "@/src/themes";
import { showError } from "@/src/utils";
import { Link, router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import CreateUserFormTab from "./signup/CreateUserFormTab";
import VerifyCode from "./signup/VerifyCode";

type UserType = "buyer" | "seller";

type SignupFormValues = {
  phoneNumber: string;
};

function SignupEntryStep({
  next,
  userType,
  setUserType,
  values,
  setValues,
  legalAccepted,
}: {
  next: () => void;
  userType: UserType;
  setUserType: (userType: UserType) => void;
  values: SignupFormValues;
  setValues: (values: SignupFormValues) => void;
  legalAccepted: boolean;
}) {
  const sendCode = async () => {
    try {
      await signUpWithPhoneOtp(defaultCountryCode + values.phoneNumber);
      next();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const legalMissingFields = legalAccepted
    ? []
    : ["aceptación de los documentos legales"];

  const tabs: Tab[] = [
    {
      title: "Comprador",
      content: (
        <CreateUserFormTab
          values={values}
          setValues={setValues}
          onCreate={sendCode}
          additionalMissingFields={legalMissingFields}
        />
      ),
    },
    {
      title: "Vendedor",
      content: (
        <CreateUserFormTab
          values={values}
          setValues={setValues}
          onCreate={sendCode}
          additionalMissingFields={legalMissingFields}
        />
      ),
    },
  ];

  return (
    <View>
      <Tabs
        tabs={tabs}
        currentIndex={userType === "seller" ? 1 : 0}
        onTabChange={(index) => setUserType(index === 1 ? "seller" : "buyer")}
      />
    </View>
  );
}

function VerifyStep({
  userType,
  values,
  legalAccepted,
}: {
  userType: UserType;
  values: SignupFormValues;
  legalAccepted: boolean;
}) {
  const isSeller = userType === "seller";

  const phoneNumber = values.phoneNumber;

  const onVerify = async (code: string) => {
    if (!isSeller) {
      return await verifyBuyerPhoneOtp(
        defaultCountryCode + phoneNumber,
        code,
        legalAccepted,
      )
        .then(() => {
          router.replace("/(auth)/identity-verification");
          return true;
        })
        .catch((err) => {
          showError(err.message);
          return false;
        });
    }

    return await verifySellerPhoneOtp(
      defaultCountryCode + phoneNumber,
      code,
      legalAccepted,
    )
      .then(() => {
        router.replace("/(auth)/identity-verification");
        return true;
      })
      .catch((err) => {
        showError(err.message);
        return false;
      });
  };

  const onResend = async () => {
    await signUpWithPhoneOtp(defaultCountryCode + phoneNumber);
  };

  return (
    <VerifyCode
      phoneNumber={phoneNumber}
      onVerify={onVerify}
      onResend={onResend}
    />
  );
}

export default function Signup() {
  const stepperRef = useRef<StepperRef>(null);

  const [userType, setUserType] = useState<UserType>("buyer");
  const [legalAccepted, setLegalAccepted] = useState(false);

  const [values, setValues] = useState<SignupFormValues>({
    phoneNumber: "",
  });

  const steps: Step[] = useMemo(() => {
    return [
      {
        title: "Crear una cuenta",
        description: "Verificación de código",
        isNextStepShown: true,
        render: (api) => (
          <SignupEntryStep
            {...api}
            userType={userType}
            setUserType={setUserType}
            values={values}
            setValues={setValues}
            legalAccepted={legalAccepted}
          />
        ),
      },
      {
        title: "Verificación de código",
        description: "Ingresa el código enviado a tu teléfono",
        isNextStepShown: false,
        render: () => (
          <VerifyStep
            userType={userType}
            values={values}
            legalAccepted={legalAccepted}
          />
        ),
      },
    ];
  }, [
    legalAccepted,
    values,
    userType,
    setUserType,
  ]);

  return (
    <View style={styles.container}>
      <Stepper
        steps={steps}
        ref={stepperRef}
        onBackAtFirstStep={() => router.back()}
      ></Stepper>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: legalAccepted }}
          style={styles.acceptanceRow}
          onPress={() => setLegalAccepted((value) => !value)}
        >
          <View
            style={[
              styles.checkbox,
              legalAccepted ? styles.checkboxSelected : null,
            ]}
          >
            {legalAccepted ? (
              <Icon name="check" size={15} color={colors.backgroudWhite} />
            ) : null}
          </View>
          <Text variant="small" style={styles.acceptanceLabel}>
            He leído y acepto los documentos legales.
          </Text>
        </Pressable>
        <View style={styles.legalLinks}>
          <Link
            href={{
              pathname: "/(detail)/legal-document",
              params: {
                code: LEGAL_DOCUMENT_CODES.termsConditions,
                title: "Términos y condiciones",
                hideMenu: "true",
              },
            }}
          >
            <Text variant="small" style={styles.legalLink}>
              Términos y condiciones
            </Text>
          </Link>
          <Text variant="small">y</Text>
          <Link
            href={{
              pathname: "/(detail)/legal-document",
              params: {
                code: LEGAL_DOCUMENT_CODES.privacyPolicy,
                title: "Política de privacidad",
                hideMenu: "true",
              },
            }}
          >
            <Text variant="small" style={styles.legalLink}>
              Política de privacidad
            </Text>
          </Link>
        </View>
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
    gap: spacing.xs,
  },
  acceptanceRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borders.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  acceptanceLabel: {
    color: colors.textDark,
  },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.xs,
  },
  legalLink: {
    textDecorationLine: "underline",
  },
});
