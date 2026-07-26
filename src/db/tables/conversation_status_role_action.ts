import { Row, TableName } from "../types";

export const TB_CONVERSATION_STATUS_ROLE_ACTION =
  "conversation_status_role_action" as const satisfies TableName;

export const COL_CONVERSATION_STATUS_ROLE_ACTION = {
  action_id: "action_id",
  created_at: "created_at",
  id: "id",
  is_enabled: "is_enabled",
  role_id: "role_id",
  sort_order: "sort_order",
  status_code: "status_code",
} as const satisfies {
  [K in keyof Row<"conversation_status_role_action"> & string]: K;
};
