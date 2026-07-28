import { defaultCountryCode } from "@/src/components/inputPhone/InputPhone";
import { Icon } from "@/src/components/Icon";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { Tab, Tabs } from "@/src/components/tabs/Tab";
import { Text } from "@/src/components/Text";
import {
  InitialProfileSetupError,
  signUpWithPhoneOtp,
  verifyPhoneOtp,
} from "@/src/lib/supabase/auth";
import { LEGAL_DOCUMENT_CODES } from "@/src/services/legal-document.service";
import { borders, colors, spacing } from "@/src/themes";
import { showError } from "@/src/utils";
import { Link, router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import CreateSellerAdminFormTab from "./signup/CreateSellerAdminFormTab";
import CreateSellerBusinessFormTab from "./signup/CreateSellerBusinessFormTab";
import CreateUserFormTab from "./signup/CreateUserFormTab";
import VerifyCode from "./signup/VerifyCode";

type UserType = "buyer" | "seller";

type BuyerFormValues = {
  fullName: string;
  idDocument: string;
  phoneNumber: string;
};

type SellerBusinessValues = {
  businessName: string;
  businessIdDocument: string;
};

type SellerAdminValues = {
  fullName: string;
  idDocument: string;
  phoneNumber: string;
};

function SignupEntryStep({
  next,
  userType,
  setUserType,
  buyerValues,
  setBuyerValues,
  sellerBusinessValues,
  setSellerBusinessValues,
  legalAccepted,
}: {
  next: () => void;
  userType: UserType;
  setUserType: (userType: UserType) => void;
  buyerValues: BuyerFormValues;
  setBuyerValues: (values: BuyerFormValues) => void;
  sellerBusinessValues: SellerBusinessValues;
  setSellerBusinessValues: (values: SellerBusinessValues) => void;
  legalAccepted: boolean;
}) {
  const createBuyer = async () => {
    if (!legalAccepted) {
      showError(
        "Aceptación requerida",
        "Acepta los Términos y la Política de privacidad para crear tu cuenta."
      );
      return;
    }
    try {
      await signUpWithPhoneOtp(defaultCountryCode + buyerValues.phoneNumber);
      next();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const goToSellerAdminStep = async () => {
    if (!legalAccepted) {
      showError(
        "Aceptación requerida",
        "Acepta los Términos y la Política de privacidad para crear tu cuenta."
      );
      return;
    }
    next();
  };

  const tabs: Tab[] = [
    {
      title: "Comprador",
      content: (
        <CreateUserFormTab
          values={buyerValues}
          setValues={setBuyerValues}
          onCreate={createBuyer}
        />
      ),
    },
    {
      title: "Vendedor",
      content: (
        <CreateSellerBusinessFormTab
          values={sellerBusinessValues}
          setValues={setSellerBusinessValues}
          onCreate={goToSellerAdminStep}
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

function SellerAdminStep({
  next,
  sellerAdminValues,
  setSellerAdminValues,
  legalAccepted,
}: {
  next: () => void;
  sellerAdminValues: SellerAdminValues;
  setSellerAdminValues: (values: SellerAdminValues) => void;
  legalAccepted: boolean;
}) {
  const createSellerAdmin = async () => {
    if (!legalAccepted) {
      showError(
        "Aceptación requerida",
        "Acepta los Términos y la Política de privacidad para crear tu cuenta."
      );
      return;
    }
    try {
      await signUpWithPhoneOtp(defaultCountryCode + sellerAdminValues.phoneNumber);
      next();
    } catch (err: any) {
      showError(err.message);
    }
  };

  return (
    <CreateSellerAdminFormTab
      values={sellerAdminValues}
      setValues={setSellerAdminValues}
      onCreate={createSellerAdmin}
    />
  );
}

function VerifyStep({
  next,
  userType,
  buyerValues,
  sellerBusinessValues,
  sellerAdminValues,
  legalAccepted,
}: {
  next: () => void;
  userType: UserType;
  buyerValues: BuyerFormValues;
  sellerBusinessValues: SellerBusinessValues;
  sellerAdminValues: SellerAdminValues;
  legalAccepted: boolean;
}) {
  const isSeller = userType === "seller";

  const phoneNumber = isSeller
    ? sellerAdminValues.phoneNumber
    : buyerValues.phoneNumber;

  const fullName = isSeller ? sellerAdminValues.fullName : buyerValues.fullName;
  const idDocument = isSeller
    ? sellerAdminValues.idDocument
    : buyerValues.idDocument;

  const onVerify = async (code: string) => {
    const initialProfile = {
      name: fullName,
      idDocument,
      role: isSeller ? ("seller" as const) : ("buyer" as const),
      businessName: isSeller ? sellerBusinessValues.businessName : null,
      businessIdDocument: isSeller
        ? sellerBusinessValues.businessIdDocument
        : null,
      legalAccepted,
    };

    return await verifyPhoneOtp(
      defaultCountryCode + phoneNumber,
      code,
      initialProfile,
    )
      .then(() => {
        next();
        return true;
      })
      .catch((err) => {
        showError(err.message);
        if (err instanceof InitialProfileSetupError) {
          router.replace("/");
        }
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

  const [buyerValues, setBuyerValues] = useState<BuyerFormValues>({
    fullName: "",
    idDocument: "",
    phoneNumber: "",
  });

  const [sellerBusinessValues, setSellerBusinessValues] =
    useState<SellerBusinessValues>({
      businessName: "",
      businessIdDocument: "",
    });

  const [sellerAdminValues, setSellerAdminValues] = useState<SellerAdminValues>(
    {
      fullName: "",
      idDocument: "",
      phoneNumber: "",
    },
  );

  const steps: Step[] = useMemo(() => {
    if (userType === "seller") {
      return [
        {
          title: "Crear una cuenta",
          description: "Información personal",
          isNextStepShown: true,
          render: (api) => (
            <SignupEntryStep
              {...api}
              userType={userType}
              setUserType={setUserType}
              buyerValues={buyerValues}
              setBuyerValues={setBuyerValues}
              sellerBusinessValues={sellerBusinessValues}
              setSellerBusinessValues={setSellerBusinessValues}
              legalAccepted={legalAccepted}
            />
          ),
        },
        {
          title: "Administrador(a)",
          description: `Agrega la información de la persona administradora de ${
            sellerBusinessValues.businessName.trim() || "negocio"
          }.`,
          isNextStepShown: true,
          render: (api) => (
            <SellerAdminStep
              {...api}
              sellerAdminValues={sellerAdminValues}
              setSellerAdminValues={setSellerAdminValues}
              legalAccepted={legalAccepted}
            />
          ),
        },
        {
          title: "Verificación de código",
          description: "Ingresa el código enviado a tu teléfono",
          isNextStepShown: false,
          render: (api) => (
            <VerifyStep
              {...api}
              userType={userType}
              buyerValues={buyerValues}
              sellerBusinessValues={sellerBusinessValues}
              sellerAdminValues={sellerAdminValues}
              legalAccepted={legalAccepted}
            />
          ),
        },
      ];
    }

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
            buyerValues={buyerValues}
            setBuyerValues={setBuyerValues}
            sellerBusinessValues={sellerBusinessValues}
            setSellerBusinessValues={setSellerBusinessValues}
            legalAccepted={legalAccepted}
          />
        ),
      },
      {
        title: "Verificación de código",
        description: "Ingresa el código enviado a tu teléfono",
        isNextStepShown: false,
        render: (api) => (
          <VerifyStep
            {...api}
            userType={userType}
            buyerValues={buyerValues}
            sellerBusinessValues={sellerBusinessValues}
            sellerAdminValues={sellerAdminValues}
            legalAccepted={legalAccepted}
          />
        ),
      },
    ];
  }, [
    buyerValues,
    legalAccepted,
    sellerAdminValues,
    sellerBusinessValues,
    userType,
    setUserType,
  ]);

  return (
    <View style={styles.container}>
      <Stepper
        steps={steps}
        ref={stepperRef}
        onFinish={() => router.replace("/(tabs)")}
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
