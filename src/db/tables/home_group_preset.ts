import { Row, TableName } from "../types";

export const TB_HOME_GROUP_PRESET =
  "home_group_preset" as const satisfies TableName;

export const COL_HOME_GROUP_PRESET = {
  code: "code",
  created_at: "created_at",
  description: "description",
  id: "id",
  is_active: "is_active",
  name: "name",
  surface_code: "surface_code",
} as const satisfies {
  [K in keyof Row<"home_group_preset"> & string]: K;
};
