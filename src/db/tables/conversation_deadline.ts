import { Row, TableName } from "../types";

export const TB_CONVERSATION_DEADLINE =
  "conversation_deadline" as const satisfies TableName;

export const COL_CONVERSATION_DEADLINE = {
  created_at: "created_at",
  deadline_type: "deadline_type",
  due_at: "due_at",
  id: "id",
  resolved_at: "resolved_at",
  trigger_transition_to: "trigger_transition_to",
} as const satisfies {
  [K in keyof Row<"conversation_deadline"> & string]: K;
};
