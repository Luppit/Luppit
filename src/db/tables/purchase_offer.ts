import { Row, TableName } from "../types";

export const TB_PURCHASE_OFFER = "purchase_offer" as const satisfies TableName;

export const COL_PURCHASE_OFFER = {
  id: "id",
  created_at: "created_at",
  business_id: "business_id",
  purchase_request_id: "purchase_request_id",
  currency_id: "currency_id",
  description: "description",
  price: "price",
  price_basis: "price_basis",
  privacy_purge_after: "privacy_purge_after",
  quantity_offered: "quantity_offered",
} as const satisfies { [K in keyof Row<"purchase_offer"> & string]: K };
