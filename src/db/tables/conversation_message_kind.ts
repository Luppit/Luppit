import { Row, TableName } from "../types";

export const TB_CONVERSATION_MESSAGE_KIND =
  "conversation_message_kind" as const satisfies TableName;

export const COL_CONVERSATION_MESSAGE_KIND = {
  code: "code",
  created_at: "created_at",
} as const satisfies {
  [K in keyof Row<"conversation_message_kind"> & string]: K;
};
