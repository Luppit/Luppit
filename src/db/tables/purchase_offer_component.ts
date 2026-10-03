import { Row, TableName } from "../types";

export const TB_PURCHASE_OFFER_COMPONENT = "purchase_offer_component" as const satisfies TableName;

export const COL_PURCHASE_OFFER_COMPONENT = {
  id: "id",
  purchase_offer_id: "purchase_offer_id",
  description: "description",
  charge_mode: "charge_mode",
  amount: "amount",
  basis: "basis",
  quantity: "quantity",
  unit_label: "unit_label",
  sort_order: "sort_order",
} as const satisfies { [K in keyof Row<"purchase_offer_component"> & string]: K };
