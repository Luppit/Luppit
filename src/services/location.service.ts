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
    .from("location")
    .select("*")
    .eq("id", locationId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as Location };
}

export async function getActiveBusinessLocations(): Promise<
  { ok: true; data: LocationOption[] } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase
    .from("location")
    .select("id,province,province_code,canton,canton_code,district,district_code,territorial_code")
    .eq("country_code", "CR")
    .eq("is_active", true)
    .order("province_code", { ascending: true })
    .order("canton_code", { ascending: true })
    .order("district_code", { ascending: true });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: (data ?? []) as LocationOption[] };
}

export function formatLocationLabel(
  location?: Pick<LocationOption, "district" | "canton" | "province"> | null
) {
  const parts = [location?.district, location?.canton, location?.province]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Sin ubicación";
}
