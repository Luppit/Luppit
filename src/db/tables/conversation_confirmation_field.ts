import { Row, TableName } from "../types";

export const TB_CONVERSATION_CONFIRMATION_FIELD =
  "conversation_confirmation_field" as const satisfies TableName;

export const COL_CONVERSATION_CONFIRMATION_FIELD = {
  id: "id",
  label: "label",
  sort_order: "sort_order",
  template_id: "template_id",
  value_source: "value_source",
} as const satisfies {
  [K in keyof Row<"conversation_confirmation_field"> & string]: K;
};
