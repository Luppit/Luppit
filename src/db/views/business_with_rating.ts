import { ViewName, ViewRow } from "../types";

export const VW_BUSINESS_WITH_RATING =
  "business_with_rating" as const satisfies ViewName;

export const COL_BUSINESS_WITH_RATING = {
  created_at: "created_at",
  id: "id",
  id_document: "id_document",
  location_id: "location_id",
  name: "name",
  num_ratings: "num_ratings",
  rating: "rating",
} as const satisfies {
  [K in keyof ViewRow<"business_with_rating"> & string]: K;
};
