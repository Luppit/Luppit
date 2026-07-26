import { Row, TableName } from "../types";

export const TB_PURCHASE_REQUEST_STATUS_UI =
  "purchase_request_status_ui" as const satisfies TableName;

export const COL_PURCHASE_REQUEST_STATUS_UI = {
  created_at: "created_at",
  id: "id",
  status_code: "status_code",
  style_code: "style_code",
  ui_text: "ui_text",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"purchase_request_status_ui"> & string]: K;
};
