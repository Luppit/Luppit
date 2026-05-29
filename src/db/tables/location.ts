import { Row, TableName } from "../types";

export const TB_LOCATION = "location" as const satisfies TableName;

export const COL_LOCATION = {
  id: "id",
  created_at: "created_at",
  country_code: "country_code",
  province_code: "province_code",
  province: "province",
  canton_code: "canton_code",
  canton: "canton",
  district_code: "district_code",
  district: "district",
  territorial_code: "territorial_code",
  is_active: "is_active",
  source: "source",
  source_version: "source_version",
} as const satisfies { [K in keyof Row<"location"> & string]: K };
