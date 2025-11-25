import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";

export type ProfileRole = Row<"profile_role">;

export async function insertRoleToProfile(
  profileId: string,
  roleId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profile_role")
    .insert({ profile_id: profileId, role_id: roleId });
  if (error) throw error;
  return data != null;
}
