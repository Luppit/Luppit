import { getSession } from "../lib/supabase";
import { AppError, fromAppError } from "../lib/supabase/errors";
import { getProfileByUserId } from "./profile.service";
import { getProfileRoleByProfileId } from "./profile.role.service";
import { getRoleById, Roles } from "./role.service";

export async function getCurrentUserRole(): Promise<
  { ok: true; data: Roles | null } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: null };

  const profileRole = await getProfileRoleByProfileId(profile.data.id);
  if (profileRole?.ok === false) return { ok: false, error: profileRole.error };
  if (!profileRole) return { ok: true, data: null };

  const role = await getRoleById(profileRole.data.role_id);
  if (role?.ok === false) return { ok: false, error: role.error };
  if (!role) return { ok: true, data: null };

  const roleName = role.data.name;
  if (roleName === Roles.SELLER) return { ok: true, data: Roles.SELLER };
  if (roleName === Roles.BUYER) return { ok: true, data: Roles.BUYER };

  return { ok: true, data: null };
}
