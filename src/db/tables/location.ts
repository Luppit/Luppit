import { Row, TableName } from "../types";

export const TB_LOCATION = "location" as const satisfies TableName;

export const COL_LOCATION = {
  id: "id",
  created_at: "created_at",
  province: "province",
  canton: "canton",
  district: "district",
} as const satisfies { [K in keyof Row<"location"> & string]: K };
