import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type ProfileBusiness = {
  profile_id: string;
  business_id: string;
  created_at: string;
};

export async function insertProfileToBusiness(
  profileId: string,
  businessId: string
): Promise<{ ok: true; data: boolean } | { ok: false; error: AppError }> {
  const { data, error } = await (supabase as any)
    .from("profile_business")
    .insert({ profile_id: profileId, business_id: businessId });
  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: data != null };
}
