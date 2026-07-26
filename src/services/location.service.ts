import { COL_LOCATION, TB_LOCATION } from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type Location = Row<"location">;
export type LocationOption = Pick<
  Location,
  | "id"
  | "province"
  | "province_code"
  | "canton"
  | "canton_code"
  | "district"
  | "district_code"
  | "territorial_code"
>;

export async function getLocationById(
  locationId: string
): Promise<{ ok: true; data: Location } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from(TB_LOCATION)
    .select("*")
    .eq(COL_LOCATION.id, locationId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as Location };
}

export async function getActiveBusinessLocations(): Promise<
  { ok: true; data: LocationOption[] } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase
    .from(TB_LOCATION)
    .select("id,province,province_code,canton,canton_code,district,district_code,territorial_code")
    .eq(COL_LOCATION.country_code, "CR")
    .eq(COL_LOCATION.is_active, true)
    .order(COL_LOCATION.province_code, { ascending: true })
    .order(COL_LOCATION.canton_code, { ascending: true })
    .order(COL_LOCATION.district_code, { ascending: true });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: (data ?? []) as LocationOption[] };
}

export function formatLocationLabel(
  location?: Pick<LocationOption, "district" | "canton" | "province"> | null
) {
  const parts = [location?.district, location?.canton, location?.province]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  const uniqueParts = parts.filter(
    (part, index) =>
      parts.findIndex(
        (candidate) => candidate.localeCompare(part, "es", { sensitivity: "base" }) === 0
      ) === index
  );

  return uniqueParts.length > 0 ? uniqueParts.join(", ") : "Sin ubicación";
}
