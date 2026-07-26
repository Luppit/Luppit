import { Row, TableName } from "../types";

export const TB_CONVERSATION_CONFIRMATION_CONDITION_INPUT =
  "conversation_confirmation_condition_input" as const satisfies TableName;

export const COL_CONVERSATION_CONFIRMATION_CONDITION_INPUT = {
  component_config: "component_config",
  condition_id: "condition_id",
  created_at: "created_at",
  helper_text: "helper_text",
  id: "id",
  input_kind: "input_kind",
  is_required: "is_required",
  label: "label",
  otp_length: "otp_length",
  payload_key: "payload_key",
  sort_order: "sort_order",
} as const satisfies {
  [K in keyof Row<"conversation_confirmation_condition_input"> & string]: K;
};
