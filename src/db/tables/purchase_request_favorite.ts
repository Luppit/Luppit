import { Row, TableName } from "../types";

export const TB_PURCHASE_REQUEST_FAVORITE =
  "purchase_request_favorite" as const satisfies TableName;

export const COL_PURCHASE_REQUEST_FAVORITE = {
  created_at: "created_at",
  id: "id",
  profile_id: "profile_id",
  purchase_request_id: "purchase_request_id",
  role_id: "role_id",
} as const satisfies {
  [K in keyof Row<"purchase_request_favorite"> & string]: K;
};
