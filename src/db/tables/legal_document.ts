import { Row, TableName } from "../types";

export const TB_LEGAL_DOCUMENT =
  "legal_document" as const satisfies TableName;

export const COL_LEGAL_DOCUMENT = {
  code: "code",
  created_at: "created_at",
  effective_date: "effective_date",
  is_active: "is_active",
  title: "title",
  updated_at: "updated_at",
  version_label: "version_label",
} as const satisfies {
  [K in keyof Row<"legal_document"> & string]: K;
};
