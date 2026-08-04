import { Row, TableName } from "../types";

export const TB_AUTH_USER_ACCOUNT_DELETION_REQUEST =
  "auth_user_account_deletion_request" as const satisfies TableName;

export const COL_AUTH_USER_ACCOUNT_DELETION_REQUEST = {
  admin_note: "admin_note",
  attempt_count: "attempt_count",
  completed_at: "completed_at",
  due_at: "due_at",
  id: "id",
  last_error_code: "last_error_code",
  lease_expires_at: "lease_expires_at",
  next_attempt_at: "next_attempt_at",
  prepared_at: "prepared_at",
  processing_started_at: "processing_started_at",
  request_channel: "request_channel",
  requested_at: "requested_at",
  retain_until: "retain_until",
  status: "status",
  storage_manifest: "storage_manifest",
  subject_hash: "subject_hash",
  user_id: "user_id",
} as const satisfies {
  [K in keyof Row<"auth_user_account_deletion_request"> & string]: K;
};
