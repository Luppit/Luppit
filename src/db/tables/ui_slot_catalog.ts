import { Row, TableName } from "../types";

export const TB_UI_SLOT_CATALOG =
  "ui_slot_catalog" as const satisfies TableName;

export const COL_UI_SLOT_CATALOG = {
  code: "code",
  created_at: "created_at",
  description: "description",
} as const satisfies {
  [K in keyof Row<"ui_slot_catalog"> & string]: K;
};
