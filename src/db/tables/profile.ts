import { Row, TableName } from "../types";

export const TB_PROFILE = "profile" as const satisfies TableName;

export const COL_PROFILE = {
  id: "id",
  created_at: "created_at",
  user_id: "user_id",
  name: "name",
  id_document: "id_document",
  phone: "phone",
  email: "email",
  email_opt_in: "email_opt_in",
  email_opt_in_at: "email_opt_in_at",
} as const satisfies { [K in keyof Row<"profile"> & string]: K };
