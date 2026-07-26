import { Row, TableName } from "../types";

export const TB_HOME_HUB_REASON =
  "home_hub_reason" as const satisfies TableName;

export const COL_HOME_HUB_REASON = {
  code: "code",
  created_at: "created_at",
  description: "description",
  is_active: "is_active",
  label: "label",
  role_code: "role_code",
  style_code: "style_code",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"home_hub_reason"> & string]: K;
};
