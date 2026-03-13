import { Row, TableName } from "../types";

export const TB_PURCHASE_OFFER = "purchase_offer" as const satisfies TableName;

export const COL_PURCHASE_OFFER = {
  id: "id",
  created_at: "created_at",
  purchase_request_id: "purchase_request_id",
  delivery_id: "delivery_id",
  currency_id: "currency_id",
  description: "description",
  price: "price",
} as const satisfies { [K in keyof Row<"purchase_offer"> & string]: K };
