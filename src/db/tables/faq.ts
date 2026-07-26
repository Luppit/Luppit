import { Row, TableName } from "../types";

export const TB_FAQ = "faq" as const satisfies TableName;

export const COL_FAQ = {
  answer: "answer",
  created_at: "created_at",
  id: "id",
  is_active: "is_active",
  question: "question",
  sort_order: "sort_order",
  updated_at: "updated_at",
} as const satisfies { [K in keyof Row<"faq"> & string]: K };
