import { Row, TableName } from "../types";

export const TB_CONVERSATION_MESSAGE =
  "conversation_message" as const satisfies TableName;

export const COL_CONVERSATION_MESSAGE = {
  id: "id",
  created_at: "created_at",
  conversation_id: "conversation_id",
  sender_profile_id: "sender_profile_id",
  text: "text",
  message_kind: "message_kind",
  image_path: "image_path",
  visible_to_role_id: "visible_to_role_id",
  buyer_open_state: "buyer_open_state",
  seller_open_state: "seller_open_state",
  buyer_opened_at: "buyer_opened_at",
  seller_opened_at: "seller_opened_at",
} as const satisfies { [K in keyof Row<"conversation_message"> & string]: K };
