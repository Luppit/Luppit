import { Row, TableName } from "../types";

export const TB_CONVERSATION_CONFIRMATION_TEMPLATE_CONDITION =
  "conversation_confirmation_template_condition" as const satisfies TableName;

export const COL_CONVERSATION_CONFIRMATION_TEMPLATE_CONDITION = {
  actor_role_id: "actor_role_id",
  created_at: "created_at",
  delivery_cat_id: "delivery_cat_id",
  description_append: "description_append",
  id: "id",
  template_id: "template_id",
} as const satisfies {
  [K in keyof Row<"conversation_confirmation_template_condition"> & string]: K;
};
