import { ViewName, ViewRow } from "../types";

export const VW_PROFILE_WITH_RATING =
  "profile_with_rating" as const satisfies ViewName;

export const COL_PROFILE_WITH_RATING = {
  created_at: "created_at",
  id: "id",
  id_document: "id_document",
  name: "name",
  num_ratings: "num_ratings",
  phone: "phone",
  rating: "rating",
  user_id: "user_id",
} as const satisfies {
  [K in keyof ViewRow<"profile_with_rating"> & string]: K;
};
