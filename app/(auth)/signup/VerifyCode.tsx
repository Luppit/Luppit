import { OtpVerifier } from "@/src/components/otpVerifier/OtpVerifier";
import React from "react";

export type VerifyCodeProps = {
  phoneNumber: string;
  onVerify: () => Promise<void>;
};

export default function VerifyCode({ phoneNumber, onVerify }: VerifyCodeProps) {
  const verifyCode = async () => {
    await onVerify();
  };

  return <OtpVerifier phoneNumber={phoneNumber} onVerify={verifyCode} />;
}
