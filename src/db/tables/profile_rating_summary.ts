import { Row, TableName } from "../types";

export const TB_PROFILE_RATING_SUMMARY =
  "profile_rating_summary" as const satisfies TableName;

export const COL_PROFILE_RATING_SUMMARY = {
  created_at: "created_at",
  num_ratings: "num_ratings",
  profile_id: "profile_id",
  rating: "rating",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"profile_rating_summary"> & string]: K;
};
