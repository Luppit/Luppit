import { Row, TableName } from "../types";

export const TB_BUSINESS_CATEGORY_PREFERENCE =
  "business_category_preference" as const satisfies TableName;

export const COL_BUSINESS_CATEGORY_PREFERENCE = {
  business_id: "business_id",
  category_id: "category_id",
  created_at: "created_at",
  id: "id",
} as const satisfies {
  [K in keyof Row<"business_category_preference"> & string]: K;
};
