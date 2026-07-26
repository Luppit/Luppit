import { Row, TableName } from "../types";

export const TB_CONVERSATION_ACTION_EXECUTOR =
  "conversation_action_executor" as const satisfies TableName;

export const COL_CONVERSATION_ACTION_EXECUTOR = {
  code: "code",
  created_at: "created_at",
  execution_type: "execution_type",
  requires_refresh: "requires_refresh",
  target: "target",
} as const satisfies {
  [K in keyof Row<"conversation_action_executor"> & string]: K;
};
