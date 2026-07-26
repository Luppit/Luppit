import { Row, TableName } from "../types";

export const TB_SEGMENT = "segment" as const satisfies TableName;

export const COL_SEGMENT = {
  created_at: "created_at",
  id: "id",
  is_disabled: "is_disabled",
  name: "name",
  sort_order: "sort_order",
  svg_name: "svg_name",
} as const satisfies { [K in keyof Row<"segment"> & string]: K };
