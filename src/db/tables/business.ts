import { Row, TableName } from "../types";

export const TB_BUSINESS = "business" as const satisfies TableName;

export const COL_BUSINESS = {
  id: "id",
  created_at: "created_at",
  name: "name",
  id_document: "id_document",
} as const satisfies { [K in keyof Row<"business"> & string]: K };
