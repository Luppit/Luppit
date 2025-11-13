import { Text } from "@/src/components/Text";
import React from "react";
import { View } from "react-native";

export type VerifyCodeProps = {
  phoneNumber: string;
  onVerify: () => Promise<void>;
};

export default function VerifyCode({ phoneNumber, onVerify }: VerifyCodeProps) {
  const maskPhone = (phone: string) => {
    return phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
  };

  const verifyCode = async () => {
    await onVerify();
  };

  return (
    <View>
      <Text variant="body" color="stateAnulated">
        Se ha enviado un código a {maskPhone(phoneNumber)}
      </Text>
    </View>
  );
}
