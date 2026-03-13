import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type Currency = Row<"currency">;

export async function getCurrencies(): Promise<
  { ok: true; data: Currency[] } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase
    .from("currency")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: (data ?? []) as Currency[] };
}
