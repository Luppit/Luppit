import { COL_ROLE, TB_ROLE } from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type Role = Row<"role">;

export enum Roles {
  BUYER = "buyer",
  SELLER = "seller",
}

export async function getRoleByName(name: Roles): Promise<{ ok: true; data: Role } | { ok: false; error: AppError }> {
  const { data, error } = await supabase
    .from(TB_ROLE)
    .select()
    .eq(COL_ROLE.name, name)
    .single();
  if (error) {
    return { ok: false, error: fromSupabaseError(error) };
  }
  return { ok: true, data: data as Role };
}

export async function getRoleById(id: string): Promise<{ ok: true; data: Role } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from(TB_ROLE)
    .select()
    .eq(COL_ROLE.id, id)
    .maybeSingle();
  if (error) {
    return { ok: false, error: fromSupabaseError(error) };
  }
  if (!data) return null;
  return { ok: true, data: data as Role };
}
