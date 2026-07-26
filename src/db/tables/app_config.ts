import { Row, TableName } from "../types";

export const TB_APP_CONFIG = "app_config" as const satisfies TableName;

export const COL_APP_CONFIG = {
  key: "key",
  value: "value",
  description: "description",
  created_at: "created_at",
  updated_at: "updated_at",
} as const satisfies { [K in keyof Row<"app_config"> & string]: K };
