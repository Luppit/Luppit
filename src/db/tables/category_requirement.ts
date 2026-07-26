import { Row, TableName } from "../types";

export const TB_CATEGORY_REQUIREMENT =
  "category_requirement" as const satisfies TableName;

export const COL_CATEGORY_REQUIREMENT = {
  allowed_values: "allowed_values",
  category_id: "category_id",
  created_at: "created_at",
  field_name: "field_name",
  field_type: "field_type",
  id: "id",
  is_array: "is_array",
  required: "required",
  version: "version",
} as const satisfies {
  [K in keyof Row<"category_requirement"> & string]: K;
};
