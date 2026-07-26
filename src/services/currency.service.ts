import { COL_CURRENCY, TB_CURRENCY } from "../db/tables";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type Currency = Row<"currency">;

export async function getCurrencies(): Promise<
  { ok: true; data: Currency[] } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase
    .from(TB_CURRENCY)
    .select("*")
    .order(COL_CURRENCY.created_at, { ascending: true });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: (data ?? []) as Currency[] };
}

export async function getCurrencyById(
  currencyId: string
): Promise<{ ok: true; data: Currency } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from(TB_CURRENCY)
    .select("*")
    .eq(COL_CURRENCY.id, currencyId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as Currency };
}
