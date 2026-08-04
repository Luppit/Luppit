import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import { InputPhone } from "@/src/components/inputPhone/InputPhone";
import {
  COSTA_RICA_PERSONAL_ID_ERROR,
  COSTA_RICA_PERSONAL_ID_LENGTH,
  isValidCostaRicaPersonalId,
} from "@/src/utils/costaRicaIdDocument";
import { showMissingFields } from "@/src/utils/useToast";
import React, { useState } from "react";
import { View } from "react-native";

export type CreateUserFormTabProps = {
  values: any;
  setValues: any;
  onCreate: (isSeller: boolean) => Promise<void>;
  isSeller?: boolean;
  additionalMissingFields?: string[];
}

const PHONE_NUMBER_LENGTH_ERROR = "El teléfono celular debe tener 8 dígitos.";

export default function CreateUserFormTab({
  values,
  setValues,
  onCreate,
  isSeller = false,
  additionalMissingFields = [],
}: CreateUserFormTabProps) {

const [errors, setErrors] = useState({
    fullName: "",
    idDocument: "",
    phoneNumber: "",
  });

  const phoneRegex = /^(?![0-9]{8}$)/;

  const validateFields = () => {
    const newErrors: Record<string, string> = {};
    const missingFields = [...additionalMissingFields];
    if (!values.fullName.trim()) missingFields.push("nombre completo");
    if (!values.idDocument.trim()) {
      missingFields.push("documento de identificación personal");
    } else if (!isValidCostaRicaPersonalId(values.idDocument)) {
      newErrors.idDocument = COSTA_RICA_PERSONAL_ID_ERROR;
    }
    if (!isSeller) {
      if (!values.phoneNumber.trim()) {
        missingFields.push("teléfono celular");
      } else if (phoneRegex.test(values.phoneNumber)) {
        newErrors.phoneNumber = PHONE_NUMBER_LENGTH_ERROR;
      }
    }

    setErrors(newErrors as any);
    showMissingFields(missingFields);
    return missingFields.length === 0 && Object.keys(newErrors).length === 0;
  };

  const createUser = async () => {
    if (!validateFields()) return;
    await onCreate(isSeller);
  }
 
  return (
    <View>
      <TextField
        label={isSeller ? "Nombre del negocio" : "Nombre completo"}
        id={"fullName"+(isSeller ? "Seller" : "Buyer")}
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
        label={isSeller ? "Documento de identificacion del negocio" : "Documento de identificación personal"}
        id={"idDocument"+(isSeller ? "Seller" : "Buyer")}
        value={values.idDocument}
        onChangeText={(text) => {
          setValues({ ...values, idDocument: text });
          if (
            errors.idDocument &&
            (!text.trim() || isValidCostaRicaPersonalId(text))
          ) {
            setErrors({ ...errors, idDocument: "" });
          }
        }}
        hasError={!!errors.idDocument}
        error={errors.idDocument}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={COSTA_RICA_PERSONAL_ID_LENGTH}
      />
      {!isSeller && (
        <InputPhone
          label="Teléfono celular"
          id={"phoneNumber"+(isSeller ? "Seller" : "Buyer")}
          value={values.phoneNumber}
          onChangeText={(text) => {
            setValues({ ...values, phoneNumber: text });
            if (errors.phoneNumber && (!text.trim() || !phoneRegex.test(text))) {
              setErrors({ ...errors, phoneNumber: "" });
            }
          }}
          hasError={!!errors.phoneNumber}
          error={errors.phoneNumber}
        />
      )}
      <Button
        variant="dark"
        onPress={() => createUser()}
        title="Siguiente"
      />
    </View>
  );
}
