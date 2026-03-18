import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type ProfileBusiness = Row<"profile_business">;

export async function insertProfileToBusiness(
  profileId: string,
  businessId: string
): Promise<{ ok: true; data: boolean } | { ok: false; error: AppError }> {
  const { data, error } = await supabase
    .from("profile_business")
    .insert({ profile_id: profileId, business_id: businessId });
  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: data != null };
}

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
