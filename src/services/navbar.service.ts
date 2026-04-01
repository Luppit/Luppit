import { getSession } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { supabase } from "../lib/supabase/client";
import { getProfileByUserId } from "./profile.service";

export type NavbarMenuItem = {
  menuCode: string;
  label: string;
  route: string;
  icon: string;
  sortOrder: number;
  roleName: string;
};

function mapNavbarMenuItem(value: any): NavbarMenuItem | null {
  if (!value || typeof value !== "object") return null;

  const menuCode = typeof value.menu_code === "string" ? value.menu_code : "";
  const label = typeof value.label === "string" ? value.label : "";
  const route = typeof value.route === "string" ? value.route : "";
  const icon = typeof value.icon === "string" ? value.icon : "";
  const sortOrder = typeof value.sort_order === "number" ? value.sort_order : 0;
  const roleName = typeof value.role_name === "string" ? value.role_name : "";

  if (!menuCode || !label || !route) return null;

  return { menuCode, label, route, icon, sortOrder, roleName };
}

export async function getCurrentUserNavbarItems(): Promise<
  { ok: true; data: NavbarMenuItem[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: [] };

  const rpcResult: any = await (supabase as any).rpc("get_navbar_items_by_profile", {
    p_profile_id: profile.data.id,
  });

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const rows = Array.isArray(rpcResult?.data) ? rpcResult.data : [];
  const data = rows
    .map(mapNavbarMenuItem)
    .filter((item): item is NavbarMenuItem => item !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { ok: true, data };
}
