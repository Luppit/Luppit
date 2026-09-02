import { OtpVerifier } from "@/src/components/otpVerifier/OtpVerifier";
import React from "react";

export type VerifyCodeProps = {
  phoneNumber: string;
  onVerify: (code: string) => Promise<boolean>;
  onResend: () => Promise<void>;
  onVerifyingChange?: (isVerifying: boolean) => void;
};

export default function VerifyCode({
  phoneNumber,
  onVerify,
  onResend,
  onVerifyingChange,
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
      onVerifyingChange={onVerifyingChange}
    />
  );
}
