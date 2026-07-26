import { RPC_FUNCTIONS } from "../db/functions";
import { getSession } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { supabase } from "../lib/supabase/client";
import { getCurrentProfileResult } from "./active.profile.service";

export type NavbarMenuItem = {
  menuCode: string;
  label: string;
  route: string;
  icon: string;
  sortOrder: number;
  roleName: string;
};

function mapNavbarMenuItem(value: unknown): NavbarMenuItem | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const menuCode = typeof row.menu_code === "string" ? row.menu_code : "";
  const label = typeof row.label === "string" ? row.label : "";
  const route = typeof row.route === "string" ? row.route : "";
  const icon = typeof row.icon === "string" ? row.icon : "";
  const sortOrder = typeof row.sort_order === "number" ? row.sort_order : 0;
  const roleName = typeof row.role_name === "string" ? row.role_name : "";

  if (!menuCode || !label || !route) return null;

  return { menuCode, label, route, icon, sortOrder, roleName };
}

export async function getCurrentUserNavbarItems(): Promise<
  { ok: true; data: NavbarMenuItem[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: [] };

  const rpcResult = await supabase.rpc(
    RPC_FUNCTIONS.GET_NAVBAR_ITEMS_BY_PROFILE,
    { p_profile_id: profile.data.id }
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const rows: unknown[] = Array.isArray(rpcResult?.data) ? rpcResult.data : [];
  const data = rows
    .map(mapNavbarMenuItem)
    .filter((item: NavbarMenuItem | null): item is NavbarMenuItem => item !== null)
    .sort((a: NavbarMenuItem, b: NavbarMenuItem) => a.sortOrder - b.sortOrder);

  return { ok: true, data };
}
