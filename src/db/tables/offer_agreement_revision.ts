import { Row, TableName } from "../types";

export const TB_OFFER_AGREEMENT_REVISION = "offer_agreement_revision" as const satisfies TableName;

export const COL_OFFER_AGREEMENT_REVISION = {
  id: "id",
  conversation_id: "conversation_id",
  purchase_offer_id: "purchase_offer_id",
  proposal_id: "proposal_id",
  offer_revision: "offer_revision",
  terms: "terms",
  fulfillment_catalog_id: "fulfillment_catalog_id",
  accepted_by_profile_id: "accepted_by_profile_id",
  created_at: "created_at",
} as const satisfies { [K in keyof Row<"offer_agreement_revision"> & string]: K };
