import { InsertRow, Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type Business = Row<"business">;
export type BusinessInsert = InsertRow<"business">;

export async function createBusiness(
  business: BusinessInsert
): Promise<{ ok: true; data: Business } | { ok: false; error: AppError }> {
  const { data, error } = await supabase
    .from("business")
    .insert(business)
    .select()
    .single();
  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: data as Business };
}

export async function getBusinessById(
  businessId: string
): Promise<{ ok: true; data: Business } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from("business")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as Business };
}
