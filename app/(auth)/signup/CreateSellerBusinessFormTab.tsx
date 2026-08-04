import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import {
  COSTA_RICA_LEGAL_ID_ERROR,
  COSTA_RICA_LEGAL_ID_LENGTH,
  isValidCostaRicaLegalId,
} from "@/src/utils/costaRicaIdDocument";
import { showMissingFields } from "@/src/utils/useToast";
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
  additionalMissingFields?: string[];
};

export default function CreateSellerBusinessFormTab({
  values,
  setValues,
  onCreate,
  additionalMissingFields = [],
}: CreateSellerBusinessFormTabProps) {
  const [errors, setErrors] = useState({
    businessName: "",
    businessIdDocument: "",
  });

  const validateFields = () => {
    const newErrors: Record<string, string> = {};
    const missingFields = [...additionalMissingFields];
    if (!values.businessName.trim()) missingFields.push("nombre del negocio");
    if (!values.businessIdDocument.trim()) {
      missingFields.push("documento de identificación del negocio");
    } else if (!isValidCostaRicaLegalId(values.businessIdDocument)) {
      newErrors.businessIdDocument = COSTA_RICA_LEGAL_ID_ERROR;
    }

    setErrors(newErrors as any);
    showMissingFields(missingFields);
    return missingFields.length === 0 && Object.keys(newErrors).length === 0;
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
          if (
            errors.businessIdDocument &&
            (!text.trim() || isValidCostaRicaLegalId(text))
          ) {
            setErrors({ ...errors, businessIdDocument: "" });
          }
        }}
        hasError={!!errors.businessIdDocument}
        error={errors.businessIdDocument}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={COSTA_RICA_LEGAL_ID_LENGTH}
      />
      <Button variant="dark" onPress={createSellerBusiness} title="Siguiente" />
    </View>
  );
}
