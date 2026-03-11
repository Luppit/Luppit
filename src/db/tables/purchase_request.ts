import { Row, TableName } from "../types";

export const TB_PURCHASE_REQUEST = "purchase_request" as const satisfies TableName;

export const COL_PURCHASE_REQUEST = {
  id: "id",
  profile_id: "profile_id",
  draft_id: "draft_id",
  category_id: "category_id",
  category_path: "category_path",
  category_name: "category_name",
  title: "title",
  summary_text: "summary_text",
  contract: "contract",
  status: "status",
  created_at: "created_at",
  published_at: "published_at",
  updated_at: "updated_at",
} as const satisfies { [K in keyof Row<"purchase_request"> & string]: K };
