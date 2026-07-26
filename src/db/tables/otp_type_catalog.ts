import { Row, TableName } from "../types";

export const TB_OTP_TYPE_CATALOG =
  "otp_type_catalog" as const satisfies TableName;

export const COL_OTP_TYPE_CATALOG = {
  code: "code",
  created_at: "created_at",
  description: "description",
} as const satisfies {
  [K in keyof Row<"otp_type_catalog"> & string]: K;
};
