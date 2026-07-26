import { Row, TableName } from "../types";

export const TB_ROLE_MENU = "role_menu" as const satisfies TableName;

export const COL_ROLE_MENU = {
  created_at: "created_at",
  is_active: "is_active",
  menu_item_id: "menu_item_id",
  role_id: "role_id",
  sort_order: "sort_order",
} as const satisfies { [K in keyof Row<"role_menu"> & string]: K };
