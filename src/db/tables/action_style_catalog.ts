import { Row, TableName } from "../types";

export const TB_ACTION_STYLE_CATALOG =
  "action_style_catalog" as const satisfies TableName;

export const COL_ACTION_STYLE_CATALOG = {
  code: "code",
  created_at: "created_at",
} as const satisfies {
  [K in keyof Row<"action_style_catalog"> & string]: K;
};
