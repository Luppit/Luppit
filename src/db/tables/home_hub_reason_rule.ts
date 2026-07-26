import { Row, TableName } from "../types";

export const TB_HOME_HUB_REASON_RULE =
  "home_hub_reason_rule" as const satisfies TableName;

export const COL_HOME_HUB_REASON_RULE = {
  action_code: "action_code",
  conversation_status_code: "conversation_status_code",
  created_at: "created_at",
  id: "id",
  is_active: "is_active",
  priority: "priority",
  reason_code: "reason_code",
  role_code: "role_code",
  stage_code: "stage_code",
} as const satisfies {
  [K in keyof Row<"home_hub_reason_rule"> & string]: K;
};
