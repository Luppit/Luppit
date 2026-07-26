import { COL_PROFILE_ROLE, TB_PROFILE_ROLE } from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type ProfileRole = Row<"profile_role">;

export async function getProfileRoleByProfileId(
  profileId: string
): Promise<{ ok: true; data: ProfileRole } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from(TB_PROFILE_ROLE)
    .select("*")
    .eq(COL_PROFILE_ROLE.profile_id, profileId)
    .maybeSingle();
  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as ProfileRole };
}
