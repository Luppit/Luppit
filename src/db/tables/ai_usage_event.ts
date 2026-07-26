import { Row, TableName } from "../types";

export const TB_AI_USAGE_EVENT = "ai_usage_event" as const satisfies TableName;

export const COL_AI_USAGE_EVENT = {
  billable_input_tokens: "billable_input_tokens",
  cached_input_tokens: "cached_input_tokens",
  client_request_id: "client_request_id",
  created_at: "created_at",
  draft_id: "draft_id",
  duration_ms: "duration_ms",
  estimated_cost_usd: "estimated_cost_usd",
  id: "id",
  image_count: "image_count",
  input_tokens: "input_tokens",
  metadata: "metadata",
  model: "model",
  offer_draft_id: "offer_draft_id",
  ok: "ok",
  output_tokens: "output_tokens",
  pass: "pass",
  pricing_model: "pricing_model",
  profile_id: "profile_id",
  request_id: "request_id",
  service: "service",
  total_tokens: "total_tokens",
  ui_action: "ui_action",
  user_id: "user_id",
} as const satisfies {
  [K in keyof Row<"ai_usage_event"> & string]: K;
};
