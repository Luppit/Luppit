import { Row, TableName } from "../types";

export const TB_CURRENCY = "currency" as const satisfies TableName;

export const COL_CURRENCY = {
  id: "id",
  created_at: "created_at",
  currency_code: "currency_code",
  display_name: "display_name",
} as const satisfies { [K in keyof Row<"currency"> & string]: K };
