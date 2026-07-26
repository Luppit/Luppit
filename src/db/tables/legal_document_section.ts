import { Row, TableName } from "../types";

export const TB_LEGAL_DOCUMENT_SECTION =
  "legal_document_section" as const satisfies TableName;

export const COL_LEGAL_DOCUMENT_SECTION = {
  body: "body",
  created_at: "created_at",
  document_code: "document_code",
  heading: "heading",
  id: "id",
  is_active: "is_active",
  sort_order: "sort_order",
  updated_at: "updated_at",
} as const satisfies {
  [K in keyof Row<"legal_document_section"> & string]: K;
};
