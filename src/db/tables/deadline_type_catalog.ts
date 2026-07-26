import { Row, TableName } from "../types";

export const TB_DEADLINE_TYPE_CATALOG =
  "deadline_type_catalog" as const satisfies TableName;

export const COL_DEADLINE_TYPE_CATALOG = {
  active_status_code: "active_status_code",
  buyer_active_message: "buyer_active_message",
  buyer_overdue_message: "buyer_overdue_message",
  code: "code",
  created_at: "created_at",
  default_trigger_transition_to: "default_trigger_transition_to",
  description: "description",
  due_at_source: "due_at_source",
  expiration_days: "expiration_days",
  seller_active_message: "seller_active_message",
  seller_overdue_message: "seller_overdue_message",
  slot_eyebrow_label: "slot_eyebrow_label",
  slot_section_label: "slot_section_label",
  ui_slot: "ui_slot",
} as const satisfies {
  [K in keyof Row<"deadline_type_catalog"> & string]: K;
};
