import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type Location = Row<"location">;

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
