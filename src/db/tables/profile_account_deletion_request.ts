import { Row, TableName } from "../types";

export const TB_PROFILE_ACCOUNT_DELETION_REQUEST =
  "profile_account_deletion_request" as const satisfies TableName;

export const COL_PROFILE_ACCOUNT_DELETION_REQUEST = {
  admin_note: "admin_note",
  completed_at: "completed_at",
  id: "id",
  profile_id: "profile_id",
  requested_at: "requested_at",
  status: "status",
} as const satisfies {
  [K in keyof Row<"profile_account_deletion_request"> & string]: K;
};
