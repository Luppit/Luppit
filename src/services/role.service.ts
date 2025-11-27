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
    .from("role")
    .select()
    .eq("name", name)
    .single();
  if (error) {
    return { ok: false, error: fromSupabaseError(error) };
  }
  return { ok: true, data: data as Role };
}
