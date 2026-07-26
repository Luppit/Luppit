import { Row, TableName } from "../types";

export const TB_CONVERSATION_ACTION_EXECUTION_TYPE_CATALOG =
  "conversation_action_execution_type_catalog" as const satisfies TableName;

export const COL_CONVERSATION_ACTION_EXECUTION_TYPE_CATALOG = {
  code: "code",
  created_at: "created_at",
  description: "description",
} as const satisfies {
  [K in keyof Row<"conversation_action_execution_type_catalog"> & string]: K;
};
