import { Row, TableName } from "../types";

export const TB_CONVERSATION_STATUS_HISTORY =
  "conversation_status_history" as const satisfies TableName;

export const COL_CONVERSATION_STATUS_HISTORY = {
  action_id: "action_id",
  actor_profile_id: "actor_profile_id",
  conversation_id: "conversation_id",
  created_at: "created_at",
  from_status_code: "from_status_code",
  id: "id",
  reason: "reason",
  to_status_code: "to_status_code",
} as const satisfies {
  [K in keyof Row<"conversation_status_history"> & string]: K;
};
