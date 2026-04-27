import { Row, TableName } from "../types";

export const TB_PURCHASE_OFFER_DELIVERY =
  "purchase_offer_delivery" as const satisfies TableName;

export const COL_PURCHASE_OFFER_DELIVERY = {
  id: "id",
  created_at: "created_at",
  delivery_cat_id: "delivery_cat_id",
  after_days: "after_days",
  after_value: "after_value",
  after_unit: "after_unit",
  max_days: "max_days",
  max_value: "max_value",
  max_unit: "max_unit",
  price: "price",
} as const satisfies { [K in keyof Row<"purchase_offer_delivery"> & string]: K };
