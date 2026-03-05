import { Row, TableName } from "../types";

export const TB_PROFILE_BUSINESS = "profile_business" as const satisfies TableName;

export const COL_PROFILE_BUSINESS = {
  id: "id",
  profile_id: "profile_id",
  business_id: "business_id",
  created_at: "created_at",
} as const satisfies { [K in keyof Row<"profile_business"> & string]: K };
