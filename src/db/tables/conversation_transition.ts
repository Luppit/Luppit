import { Row, TableName } from "../types";

export const TB_CONVERSATION_TRANSITION =
  "conversation_transition" as const satisfies TableName;

export const COL_CONVERSATION_TRANSITION = {
  action_id: "action_id",
  actor_role_id: "actor_role_id",
  created_at: "created_at",
  from_status_code: "from_status_code",
  id: "id",
  is_system_transition: "is_system_transition",
  to_status_code: "to_status_code",
} as const satisfies {
  [K in keyof Row<"conversation_transition"> & string]: K;
};
