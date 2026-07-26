import { Row, TableName } from "../types";

export const TB_BUSINESS_RATING_SUMMARY =
  "business_rating_summary" as const satisfies TableName;

export const COL_BUSINESS_RATING_SUMMARY = {
  business_id: "business_id",
  created_at: "created_at",
  num_ratings: "num_ratings",
  rating: "rating",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"business_rating_summary"> & string]: K;
};
