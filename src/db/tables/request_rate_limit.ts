import { Row, TableName } from "../types";

export const TB_REQUEST_RATE_LIMIT =
  "request_rate_limit" as const satisfies TableName;

export const COL_REQUEST_RATE_LIMIT = {
  bucket: "bucket",
  profile_id: "profile_id",
  request_count: "request_count",
  updated_at: "updated_at",
  window_start: "window_start",
} as const satisfies {
  [K in keyof Row<"request_rate_limit"> & string]: K;
};
