import Button from "@/src/components/button/Button";
import { InputPhone } from "@/src/components/inputPhone/InputPhone";
import { showMissingFields } from "@/src/utils/useToast";
import React, { useState } from "react";
import { View } from "react-native";

export type CreateUserFormTabProps = {
  values: any;
  setValues: any;
  onCreate: () => Promise<void>;
  additionalMissingFields?: string[];
}

const PHONE_NUMBER_LENGTH_ERROR = "El teléfono celular debe tener 8 dígitos.";

export default function CreateUserFormTab({
  values,
  setValues,
  onCreate,
  additionalMissingFields = [],
}: CreateUserFormTabProps) {

const [errors, setErrors] = useState({
    phoneNumber: "",
  });

  const phoneRegex = /^(?![0-9]{8}$)/;

  const validateFields = () => {
    const newErrors: Record<string, string> = {};
    const missingFields = [...additionalMissingFields];
    if (!values.phoneNumber.trim()) {
      missingFields.push("teléfono celular");
    } else if (phoneRegex.test(values.phoneNumber)) {
      newErrors.phoneNumber = PHONE_NUMBER_LENGTH_ERROR;
    }

    setErrors(newErrors as any);
    showMissingFields(missingFields);
    return missingFields.length === 0 && Object.keys(newErrors).length === 0;
  };

  const createUser = async () => {
    if (!validateFields()) return;
    await onCreate();
  }
 
  return (
    <View>
      <InputPhone
        label="Teléfono celular"
        id="phoneNumberBuyer"
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
      <Button
        variant="dark"
        onPress={() => createUser()}
        title="Siguiente"
      />
    </View>
  );
}
