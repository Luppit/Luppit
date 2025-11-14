import { OtpVerifier } from "@/src/components/otpVerifier/OtpVerifier";
import React from "react";

export type VerifyCodeProps = {
  phoneNumber: string;
  onVerify: (code : string) => Promise<boolean>;
};

export default function VerifyCode({ phoneNumber, onVerify }: VerifyCodeProps) {
  const verifyCode = async (code : string) => {
    return await onVerify(code);
  };

  return <OtpVerifier phoneNumber={phoneNumber} onVerify={verifyCode} />;
}
