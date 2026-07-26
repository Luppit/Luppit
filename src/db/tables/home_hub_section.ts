import { Row, TableName } from "../types";

export const TB_HOME_HUB_SECTION =
  "home_hub_section" as const satisfies TableName;

export const COL_HOME_HUB_SECTION = {
  code: "code",
  created_at: "created_at",
  description: "description",
  is_active: "is_active",
  name: "name",
  preview_limit: "preview_limit",
  role_code: "role_code",
  rule_config: "rule_config",
  sort_order: "sort_order",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"home_hub_section"> & string]: K;
};
