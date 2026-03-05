import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import React, { useState } from "react";
import { View } from "react-native";

export type CreateSellerBusinessFormTabProps = {
  values: {
    businessName: string;
    businessIdDocument: string;
  };
  setValues: (values: {
    businessName: string;
    businessIdDocument: string;
  }) => void;
  onCreate: () => Promise<void>;
};

const BUSINESS_NAME_ERROR = "El nombre del negocio es obligatorio.";
const BUSINESS_ID_DOCUMENT_ERROR =
  "El documento de identificacion del negocio es obligatorio.";

export default function CreateSellerBusinessFormTab({
  values,
  setValues,
  onCreate,
}: CreateSellerBusinessFormTabProps) {
  const [errors, setErrors] = useState({
    businessName: "",
    businessIdDocument: "",
  });

  const validateFields = () => {
    const newErrors: Record<string, string> = {};
    if (!values.businessName.trim()) newErrors.businessName = BUSINESS_NAME_ERROR;
    if (!values.businessIdDocument.trim()) {
      newErrors.businessIdDocument = BUSINESS_ID_DOCUMENT_ERROR;
    }

    setErrors(newErrors as any);
    return Object.keys(newErrors).length === 0;
  };

  const createSellerBusiness = async () => {
    if (!validateFields()) return;
    await onCreate();
  };

  return (
    <View>
      <TextField
        label="Nombre del negocio"
        id="businessNameSeller"
        value={values.businessName}
        onChangeText={(text) => {
          setValues({ ...values, businessName: text });
          if (errors.businessName && text.trim()) {
            setErrors({ ...errors, businessName: "" });
          }
        }}
        hasError={!!errors.businessName}
        error={errors.businessName}
      />
      <TextField
        label="Documento de identificacion del negocio"
        id="businessIdDocumentSeller"
        value={values.businessIdDocument}
        onChangeText={(text) => {
          setValues({ ...values, businessIdDocument: text });
          if (errors.businessIdDocument && text.trim()) {
            setErrors({ ...errors, businessIdDocument: "" });
          }
        }}
        hasError={!!errors.businessIdDocument}
        error={errors.businessIdDocument}
      />
      <Button variant="dark" onPress={createSellerBusiness} title="Siguiente" />
    </View>
  );
}
