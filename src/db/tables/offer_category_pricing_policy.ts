import { Row, TableName } from "../types";

export const TB_OFFER_CATEGORY_PRICING_POLICY = "offer_category_pricing_policy" as const satisfies TableName;

export const COL_OFFER_CATEGORY_PRICING_POLICY = {
  category_id: "category_id",
  allowed_units: "allowed_units",
  allow_fractional_quantities: "allow_fractional_quantities",
  max_components: "max_components",
} as const satisfies { [K in keyof Row<"offer_category_pricing_policy"> & string]: K };
