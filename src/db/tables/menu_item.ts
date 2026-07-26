import { Row, TableName } from "../types";

export const TB_MENU_ITEM = "menu_item" as const satisfies TableName;

export const COL_MENU_ITEM = {
  code: "code",
  created_at: "created_at",
  icon: "icon",
  id: "id",
  is_active: "is_active",
  label: "label",
  route: "route",
} as const satisfies { [K in keyof Row<"menu_item"> & string]: K };
