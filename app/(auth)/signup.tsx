import { defaultCountryCode } from "@/src/components/inputPhone/InputPhone";
import { Icon } from "@/src/components/Icon";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { Tab, Tabs } from "@/src/components/tabs/Tab";
import { Text } from "@/src/components/Text";
import {
  PostPhoneVerificationSetupError,
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
  onToggleLegal,
}: {
  next: () => void;
  userType: UserType;
  setUserType: (userType: UserType) => void;
  values: SignupFormValues;
  setValues: (values: SignupFormValues) => void;
  legalAccepted: boolean;
  onToggleLegal: () => void;
}) {
  const [isSendingCode, setIsSendingCode] = useState(false);
  const isSendingCodeRef = useRef(false);

  const sendCode = async () => {
    if (isSendingCodeRef.current) return;
    isSendingCodeRef.current = true;
    setIsSendingCode(true);
    let didSendCode = false;
    try {
      await signUpWithPhoneOtp(defaultCountryCode + values.phoneNumber);
      didSendCode = true;
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "No se pudo enviar el código."
      );
    } finally {
      isSendingCodeRef.current = false;
      setIsSendingCode(false);
    }
    if (didSendCode) next();
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
          loading={isSendingCode}
          additionalMissingFields={legalMissingFields}
          supportingContent={(
            <LegalAcceptance
              accepted={legalAccepted}
              onToggle={onToggleLegal}
            />
          )}
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
          loading={isSendingCode}
          additionalMissingFields={legalMissingFields}
          supportingContent={(
            <LegalAcceptance
              accepted={legalAccepted}
              onToggle={onToggleLegal}
            />
          )}
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

function LegalAcceptance({
  accepted,
  onToggle,
}: {
  accepted: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.legalAcceptance}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        hitSlop={8}
        style={styles.acceptanceRow}
        onPress={onToggle}
      >
        <View
          style={[
            styles.checkbox,
            accepted ? styles.checkboxSelected : null,
          ]}
        >
          {accepted ? (
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
  );
}

function VerifyStep({
  userType,
  values,
  legalAccepted,
  onVerifyingChange,
}: {
  userType: UserType;
  values: SignupFormValues;
  legalAccepted: boolean;
  onVerifyingChange: (isVerifying: boolean) => void;
}) {
  const isSeller = userType === "seller";

  const phoneNumber = values.phoneNumber;

  const onVerify = async (code: string) => {
    const verify = isSeller ? verifySellerPhoneOtp : verifyBuyerPhoneOtp;
    return await verify(defaultCountryCode + phoneNumber, code, legalAccepted)
      .then(() => {
        return true;
      })
      .catch((err) => {
        if (err instanceof PostPhoneVerificationSetupError) {
          showError("Teléfono verificado", err.message);
          return true;
        }
        showError(
          err instanceof Error
            ? err.message
            : "No pudimos verificar el código."
        );
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
      onVerifyingChange={onVerifyingChange}
    />
  );
}

export default function Signup() {
  const stepperRef = useRef<StepperRef>(null);

  const [userType, setUserType] = useState<UserType>("buyer");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
            onToggleLegal={() => setLegalAccepted((value) => !value)}
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
            onVerifyingChange={setIsVerifying}
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
        backDisabled={isVerifying}
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
  legalAcceptance: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  acceptanceRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.textDark,
    borderRadius: borders.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: colors.textDark,
    backgroundColor: colors.textDark,
  },
  acceptanceLabel: {
    color: colors.textDark,
  },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: spacing.xs,
  },
  legalLink: {
    textDecorationLine: "underline",
  },
});
