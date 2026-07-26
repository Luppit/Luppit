import { Row, TableName } from "../types";

export const TB_PURCHASE_OFFER_PICKUP_METHOD =
  "purchase_offer_pickup_method" as const satisfies TableName;

export const COL_PURCHASE_OFFER_PICKUP_METHOD = {
  created_at: "created_at",
  id: "id",
  pickup_after_days: "pickup_after_days",
  pickup_catalog_id: "pickup_catalog_id",
  purchase_offer_id: "purchase_offer_id",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"purchase_offer_pickup_method"> & string]: K;
};
