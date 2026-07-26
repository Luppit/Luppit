import { Row, TableName } from "../types";

export const TB_HOME_GROUP = "home_group" as const satisfies TableName;

export const COL_HOME_GROUP = {
  code: "code",
  created_at: "created_at",
  description: "description",
  id: "id",
  is_active: "is_active",
  name: "name",
  surface_code: "surface_code",
} as const satisfies { [K in keyof Row<"home_group"> & string]: K };
