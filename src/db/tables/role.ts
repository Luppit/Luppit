import { Row, TableName } from "../types";

export const TB_ROLE = "role" as const satisfies TableName;

export const COL_ROLE = {
  id: "id",
  created_at: "created_at",
  name: "name",
} as const satisfies { [K in keyof Row<"role"> & string]: K };
