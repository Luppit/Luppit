import { Row, TableName } from "../types";

export const TB_CONVERSATION_STATUS =
  "conversation_status" as const satisfies TableName;

export const COL_CONVERSATION_STATUS = {
  code: "code",
  created_at: "created_at",
  description: "description",
  icon: "icon",
  is_terminal: "is_terminal",
  sort_order: "sort_order",
  style_code: "style_code",
  ui_text: "ui_text",
} as const satisfies {
  [K in keyof Row<"conversation_status"> & string]: K;
};
