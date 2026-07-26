import { Row, TableName } from "../types";

export const TB_PURCHASE_REQUEST_STATUS =
  "purchase_request_status" as const satisfies TableName;

export const COL_PURCHASE_REQUEST_STATUS = {
  code: "code",
  created_at: "created_at",
  description: "description",
  is_buyer_home_visible: "is_buyer_home_visible",
  is_seller_home_visible: "is_seller_home_visible",
  is_terminal: "is_terminal",
} as const satisfies {
  [K in keyof Row<"purchase_request_status"> & string]: K;
};
