import { Row, TableName } from "../types";

export const TB_PURCHASE_OFFER_IMAGE = "purchase_offer_image" as const satisfies TableName;

export const COL_PURCHASE_OFFER_IMAGE = {
  id: "id",
  created_at: "created_at",
  purchase_offer_id: "purchase_offer_id",
  path: "path",
} as const satisfies { [K in keyof Row<"purchase_offer_image"> & string]: K };
