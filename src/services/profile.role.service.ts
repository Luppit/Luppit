import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type ProfileRole = Row<"profile_role">;

export async function insertRoleToProfile(
  profileId: string,
  roleId: string
): Promise<{ ok: true; data : boolean } | { ok: false; error: AppError }> {
  const { data, error } = await supabase
    .from("profile_role")
    .insert({ profile_id: profileId, role_id: roleId });
  if (error) throw { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: data != null };
}

export async function getProfileRoleByProfileId(
  profileId: string
): Promise<{ ok: true; data: ProfileRole } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from("profile_role")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as ProfileRole };
}
