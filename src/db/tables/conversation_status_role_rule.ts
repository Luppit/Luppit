import { Row, TableName } from "../types";

export const TB_CONVERSATION_STATUS_ROLE_RULE =
  "conversation_status_role_rule" as const satisfies TableName;

export const COL_CONVERSATION_STATUS_ROLE_RULE = {
  can_send_attachments: "can_send_attachments",
  can_send_messages: "can_send_messages",
  conversation_status: "conversation_status",
  created_at: "created_at",
  id: "id",
  role_id: "role_id",
} as const satisfies {
  [K in keyof Row<"conversation_status_role_rule"> & string]: K;
};
