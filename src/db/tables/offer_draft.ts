import { Row, TableName } from "../types";

export const TB_OFFER_DRAFT = "offer_draft" as const satisfies TableName;

export const COL_OFFER_DRAFT = {
  client_request_hash: "client_request_hash",
  client_request_id: "client_request_id",
  conversation_id: "conversation_id",
  created_at: "created_at",
  data: "data",
  id: "id",
  pending_action: "pending_action",
  profile_id: "profile_id",
  purchase_offer_id: "purchase_offer_id",
  purchase_request_id: "purchase_request_id",
  status: "status",
  ui_state: "ui_state",
  updated_at: "updated_at",
} as const satisfies { [K in keyof Row<"offer_draft"> & string]: K };
