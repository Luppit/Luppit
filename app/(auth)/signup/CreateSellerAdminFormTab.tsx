import Button from "@/src/components/button/Button";
import { TextField } from "@/src/components/inputField/InputField";
import { InputPhone } from "@/src/components/inputPhone/InputPhone";
import React, { useState } from "react";
import { View } from "react-native";

export type CreateSellerAdminFormTabProps = {
  values: {
    fullName: string;
    idDocument: string;
    phoneNumber: string;
  };
  setValues: (values: {
    fullName: string;
    idDocument: string;
    phoneNumber: string;
  }) => void;
  onCreate: () => Promise<void>;
};

const FULL_NAME_ERROR = "El nombre completo es obligatorio.";
const ID_DOCUMENT_ERROR = "El documento de identificación es obligatorio.";
const PHONE_NUMBER_ERROR = "El teléfono celular es obligatorio.";
const PHONE_NUMBER_LENGTH_ERROR = "El teléfono celular debe tener 8 dígitos.";

export default function CreateSellerAdminFormTab({
  values,
  setValues,
  onCreate,
}: CreateSellerAdminFormTabProps) {
  const [errors, setErrors] = useState({
    fullName: "",
    idDocument: "",
    phoneNumber: "",
  });

  const phoneRegex = /^(?![0-9]{8}$)/;

  const validateFields = () => {
    const newErrors: Record<string, string> = {};
    if (!values.fullName.trim()) newErrors.fullName = FULL_NAME_ERROR;
    if (!values.idDocument.trim()) newErrors.idDocument = ID_DOCUMENT_ERROR;
    if (!values.phoneNumber.trim()) newErrors.phoneNumber = PHONE_NUMBER_ERROR;

    if (values.phoneNumber && !!phoneRegex.test(values.phoneNumber)) {
      newErrors.phoneNumber = PHONE_NUMBER_LENGTH_ERROR;
    }

    setErrors(newErrors as any);
    return Object.keys(newErrors).length === 0;
  };

  const createSellerAdmin = async () => {
    if (!validateFields()) return;
    await onCreate();
  };

  return (
    <View>
      <TextField
        label="Nombre completo"
        id="fullNameSellerAdmin"
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
        id="idDocumentSellerAdmin"
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
        id="phoneNumberSellerAdmin"
        value={values.phoneNumber}
        onChangeText={(text) => {
          setValues({ ...values, phoneNumber: text });
          if (errors.phoneNumber && phoneRegex.test(text)) {
            setErrors({ ...errors, phoneNumber: "" });
          }
        }}
        hasError={!!errors.phoneNumber}
        error={errors.phoneNumber}
      />
      <Button variant="dark" onPress={createSellerAdmin} title="Siguiente" />
    </View>
  );
}
