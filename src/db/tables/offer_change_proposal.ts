import { Row, TableName } from "../types";

export const TB_OFFER_CHANGE_PROPOSAL = "offer_change_proposal" as const satisfies TableName;

export const COL_OFFER_CHANGE_PROPOSAL = {
  id: "id",
  conversation_id: "conversation_id",
  purchase_offer_id: "purchase_offer_id",
  offer_draft_id: "offer_draft_id",
  base_offer_revision: "base_offer_revision",
  current_terms: "current_terms",
  proposed_terms: "proposed_terms",
  status: "status",
  created_at: "created_at",
  resolved_at: "resolved_at",
  resolved_by_profile_id: "resolved_by_profile_id",
  result: "result",
} as const satisfies { [K in keyof Row<"offer_change_proposal"> & string]: K };
