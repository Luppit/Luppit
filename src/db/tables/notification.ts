import { Row, TableName } from "../types";

export const TB_NOTIFICATION = "notification" as const satisfies TableName;

export const COL_NOTIFICATION = {
  conversation_id: "conversation_id",
  conversation_status_history_id: "conversation_status_history_id",
  created_at: "created_at",
  dedupe_key: "dedupe_key",
  event_code: "event_code",
  id: "id",
  message: "message",
  payload: "payload",
  title: "title",
  type_code: "type_code",
} as const satisfies { [K in keyof Row<"notification"> & string]: K };
