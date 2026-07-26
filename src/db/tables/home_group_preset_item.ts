import { Row, TableName } from "../types";

export const TB_HOME_GROUP_PRESET_ITEM =
  "home_group_preset_item" as const satisfies TableName;

export const COL_HOME_GROUP_PRESET_ITEM = {
  created_at: "created_at",
  group_id: "group_id",
  id: "id",
  max_items: "max_items",
  preset_id: "preset_id",
  sort_order: "sort_order",
} as const satisfies {
  [K in keyof Row<"home_group_preset_item"> & string]: K;
};
