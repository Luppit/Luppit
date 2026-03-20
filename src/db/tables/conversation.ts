import { Row, TableName } from "../types";

export const TB_CONVERSATION = "conversation" as const satisfies TableName;

export const COL_CONVERSATION = {
  id: "id",
  created_at: "created_at",
  purchase_request_id: "purchase_request_id",
  buyer_profile_id: "buyer_profile_id",
  seller_profile_id: "seller_profile_id",
  purchase_offer_id: "purchase_offer_id",
  status_code: "status_code",
} as const satisfies { [K in keyof Row<"conversation"> & string]: K };
