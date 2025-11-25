import { Row, TableName } from "../types";

export const TB_PROFILE_ROLE = "profile_role" as const satisfies TableName;

export const COL_PROFILE_ROLE = {
  profile_id: "profile_id",
  role_id: "role_id",
  created_at: "created_at",
} as const satisfies { [K in keyof Row<"profile_role"> & string]: K };