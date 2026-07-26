import { Row, TableName } from "../types";

export const TB_PURCHASE_OFFER_DELIVERY_METHOD =
  "purchase_offer_delivery_method" as const satisfies TableName;

export const COL_PURCHASE_OFFER_DELIVERY_METHOD = {
  created_at: "created_at",
  delivery_catalog_id: "delivery_catalog_id",
  id: "id",
  purchase_offer_id: "purchase_offer_id",
  shipping_max_days: "shipping_max_days",
  shipping_price: "shipping_price",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"purchase_offer_delivery_method"> & string]: K;
};
