import { Row, TableName } from "../types";

export const TB_DELIVERY_CATALOG = "delivery_catalog" as const satisfies TableName;

export const COL_DELIVERY_CATALOG = {
  id: "id",
  created_at: "created_at",
  display_name: "display_name",
  hint: "hint",
} as const satisfies { [K in keyof Row<"delivery_catalog"> & string]: K };
