import { Row, TableName } from "../types";

export const TB_CONVERSATION_CONFIRMATION_TEMPLATE =
  "conversation_confirmation_template" as const satisfies TableName;

export const COL_CONVERSATION_CONFIRMATION_TEMPLATE = {
  cancel_icon: "cancel_icon",
  cancel_label: "cancel_label",
  code: "code",
  confirm_icon: "confirm_icon",
  confirm_label: "confirm_label",
  confirm_style_code: "confirm_style_code",
  created_at: "created_at",
  description_template: "description_template",
  id: "id",
  title: "title",
} as const satisfies {
  [K in keyof Row<"conversation_confirmation_template"> & string]: K;
};
