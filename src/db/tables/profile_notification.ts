import { Row, TableName } from "../types";

export const TB_PROFILE_NOTIFICATION =
  "profile_notification" as const satisfies TableName;

export const COL_PROFILE_NOTIFICATION = {
  created_at: "created_at",
  notification_id: "notification_id",
  profile_id: "profile_id",
  read_at: "read_at",
} as const satisfies {
  [K in keyof Row<"profile_notification"> & string]: K;
};
