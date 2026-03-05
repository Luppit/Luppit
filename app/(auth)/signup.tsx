import { defaultCountryCode } from "@/src/components/inputPhone/InputPhone";
import Stepper, { Step, StepperRef } from "@/src/components/stepper/Stepper";
import { Tab, Tabs } from "@/src/components/tabs/Tab";
import { Text } from "@/src/components/Text";
import { signUpWithPhoneOtp, verifyPhoneOtp } from "@/src/lib/supabase/auth";
import { createBusiness } from "@/src/services/business.service";
import { insertProfileToBusiness } from "@/src/services/profile.business.service";
import { Profile } from "@/src/services/profile.service";
import { spacing } from "@/src/themes/spacing";
import { showError } from "@/src/utils";
import { Link, router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
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
}: {
  next: () => void;
  userType: UserType;
  setUserType: (userType: UserType) => void;
  buyerValues: BuyerFormValues;
  setBuyerValues: (values: BuyerFormValues) => void;
  sellerBusinessValues: SellerBusinessValues;
  setSellerBusinessValues: (values: SellerBusinessValues) => void;
}) {
  const createBuyer = async () => {
    signUpWithPhoneOtp(defaultCountryCode + buyerValues.phoneNumber)
      .then(() => {
        next();
      })
      .catch((err) => {
        showError(err.message);
      });
  };

  const goToSellerAdminStep = async () => {
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
}: {
  next: () => void;
  sellerAdminValues: SellerAdminValues;
  setSellerAdminValues: (values: SellerAdminValues) => void;
}) {
  const createSellerAdmin = async () => {
    signUpWithPhoneOtp(defaultCountryCode + sellerAdminValues.phoneNumber)
      .then(() => {
        next();
      })
      .catch((err) => {
        showError(err.message);
      });
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
}: {
  next: () => void;
  userType: UserType;
  buyerValues: BuyerFormValues;
  sellerBusinessValues: SellerBusinessValues;
  sellerAdminValues: SellerAdminValues;
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
    const userProfile: Profile = {
      id: "",
      name: fullName,
      id_document: idDocument,
      created_at: new Date().toISOString(),
      user_id: "",
      phone: defaultCountryCode + phoneNumber,
    };

    await verifyPhoneOtp(
      defaultCountryCode + phoneNumber,
      code,
      userProfile,
      isSeller,
      async (createdProfile) => {
        if (!isSeller) return;

        const businessResult = await createBusiness({
          id: "",
          created_at: new Date().toISOString(),
          name: sellerBusinessValues.businessName,
          id_document: sellerBusinessValues.businessIdDocument,
        });

        if (businessResult.ok === false) {
          throw new Error(businessResult.error.message);
        }

        const linkResult = await insertProfileToBusiness(
          createdProfile.id,
          businessResult.data.id,
        );

        if (linkResult.ok === false) {
          throw new Error(linkResult.error.message);
        }
      },
    )
      .then(() => {
        next();
        return true;
      })
      .catch((err) => {
        showError(err.message);
        return false;
      });

    return false;
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

export default function signup() {
  const stepperRef = useRef<StepperRef>(null);

  const [userType, setUserType] = useState<UserType>("buyer");

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
          />
        ),
      },
    ];
  }, [
    buyerValues,
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
