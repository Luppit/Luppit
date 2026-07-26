import { Row, TableName } from "../types";

export const TB_OTP_CODE = "otp_code" as const satisfies TableName;

export const COL_OTP_CODE = {
  attempt_count: "attempt_count",
  code_hash: "code_hash",
  consumed_at: "consumed_at",
  consumed_by_profile_id: "consumed_by_profile_id",
  conversation_id: "conversation_id",
  created_at: "created_at",
  created_by_profile_id: "created_by_profile_id",
  email: "email",
  expires_at: "expires_at",
  id: "id",
  invalidated_at: "invalidated_at",
  last_attempt_at: "last_attempt_at",
  otp_type_code: "otp_type_code",
  target_profile_id: "target_profile_id",
} as const satisfies { [K in keyof Row<"otp_code"> & string]: K };
