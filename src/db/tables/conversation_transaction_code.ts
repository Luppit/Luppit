import { Row, TableName } from "../types";

export const TB_CONVERSATION_TRANSACTION_CODE =
  "conversation_transaction_code" as const satisfies TableName;

export const COL_CONVERSATION_TRANSACTION_CODE = {
  code_hash: "code_hash",
  consumed_at: "consumed_at",
  consumed_by_profile_id: "consumed_by_profile_id",
  conversation_id: "conversation_id",
  created_at: "created_at",
  created_by_profile_id: "created_by_profile_id",
} as const satisfies {
  [K in keyof Row<"conversation_transaction_code"> & string]: K;
};
