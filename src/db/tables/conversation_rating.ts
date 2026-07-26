import { Row, TableName } from "../types";

export const TB_CONVERSATION_RATING =
  "conversation_rating" as const satisfies TableName;

export const COL_CONVERSATION_RATING = {
  action_code: "action_code",
  comment: "comment",
  conversation_id: "conversation_id",
  created_at: "created_at",
  id: "id",
  rated_business_id: "rated_business_id",
  rated_profile_id: "rated_profile_id",
  rater_profile_id: "rater_profile_id",
  stars: "stars",
  tags: "tags",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"conversation_rating"> & string]: K;
};
