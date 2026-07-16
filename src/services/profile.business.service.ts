import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type ProfileBusiness = Row<"profile_business">;

export async function getBusinessIdByProfileId(
  profileId: string
): Promise<{ ok: true; data: string } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from("profile_business")
    .select("business_id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data?.business_id) return null;
  return { ok: true, data: data.business_id };
}
