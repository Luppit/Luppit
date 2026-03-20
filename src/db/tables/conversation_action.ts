import { Row, TableName } from "../types";

export const TB_CONVERSATION_ACTION =
  "conversation_action" as const satisfies TableName;

export const COL_CONVERSATION_ACTION = {
  id: "id",
  created_at: "created_at",
  code: "code",
  label: "label",
  icon: "icon",
  ui_slot: "ui_slot",
  style_code: "style_code",
} as const satisfies { [K in keyof Row<"conversation_action"> & string]: K };
