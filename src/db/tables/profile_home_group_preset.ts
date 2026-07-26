import { Row, TableName } from "../types";

export const TB_PROFILE_HOME_GROUP_PRESET =
  "profile_home_group_preset" as const satisfies TableName;

export const COL_PROFILE_HOME_GROUP_PRESET = {
  created_at: "created_at",
  id: "id",
  preset_id: "preset_id",
  profile_id: "profile_id",
} as const satisfies {
  [K in keyof Row<"profile_home_group_preset"> & string]: K;
};
