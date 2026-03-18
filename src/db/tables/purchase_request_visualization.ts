import { Row, TableName } from "../types";

export const TB_PURCHASE_REQUEST_VISUALIZATION =
  "purchase_request_visualization" as const satisfies TableName;

export const COL_PURCHASE_REQUEST_VISUALIZATION = {
  id: "id",
  created_at: "created_at",
  profile_id: "profile_id",
  purchase_request_id: "purchase_request_id",
} as const satisfies {
  [K in keyof Row<"purchase_request_visualization"> & string]: K;
};
