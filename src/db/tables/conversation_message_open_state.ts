import { Row, TableName } from "../types";

export const TB_CONVERSATION_MESSAGE_OPEN_STATE =
  "conversation_message_open_state" as const satisfies TableName;

export const COL_CONVERSATION_MESSAGE_OPEN_STATE = {
  code: "code",
  created_at: "created_at",
  description: "description",
} as const satisfies {
  [K in keyof Row<"conversation_message_open_state"> & string]: K;
};
