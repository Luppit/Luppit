import { Row, TableName } from "../types";

export const TB_AUTH_USER_ACCOUNT_DELETION_REQUEST =
  "auth_user_account_deletion_request" as const satisfies TableName;

export const COL_AUTH_USER_ACCOUNT_DELETION_REQUEST = {
  admin_note: "admin_note",
  completed_at: "completed_at",
  id: "id",
  requested_at: "requested_at",
  status: "status",
  user_id: "user_id",
} as const satisfies {
  [K in keyof Row<"auth_user_account_deletion_request"> & string]: K;
};
