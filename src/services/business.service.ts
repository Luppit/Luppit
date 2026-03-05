import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type Business = {
  id: string;
  created_at: string;
  name: string;
  id_document: string;
};

export async function createBusiness(
  business: Business
): Promise<{ ok: true; data: Business } | { ok: false; error: AppError }> {
  const { id: _omit, ...insertData } = business;
  const { data, error } = await (supabase as any)
    .from("business")
    .insert(insertData)
    .select()
    .single();
  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: data as Business };
}
