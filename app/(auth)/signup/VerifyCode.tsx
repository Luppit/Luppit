import { OtpVerifier } from "@/src/components/otpVerifier/OtpVerifier";
import React from "react";

export type VerifyCodeProps = {
  phoneNumber: string;
  onVerify: (code: string) => Promise<boolean>;
  onResend: () => Promise<void>;
};

export default function VerifyCode({
  phoneNumber,
  onVerify,
  onResend,
}: VerifyCodeProps) {
  const verifyCode = async (code: string) => {
    return await onVerify(code);
  };

  const resendCode = async () => {
    return await onResend();
  };

  return (
    <OtpVerifier
      phoneNumber={phoneNumber}
      onVerify={verifyCode}
      onResendCode={resendCode}
    />
  );
}
