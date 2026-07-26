import { Row, TableName } from "../types";

export const TB_NOTIFICATION_TYPE_CATALOG =
  "notification_type_catalog" as const satisfies TableName;

export const COL_NOTIFICATION_TYPE_CATALOG = {
  code: "code",
  created_at: "created_at",
  description: "description",
  is_active: "is_active",
  label: "label",
  sort_order: "sort_order",
} as const satisfies {
  [K in keyof Row<"notification_type_catalog"> & string]: K;
};
