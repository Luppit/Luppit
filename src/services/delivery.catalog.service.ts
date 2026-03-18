import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type DeliveryCatalog = Row<"delivery_catalog">;

export async function getDeliveryCatalog(): Promise<
  { ok: true; data: DeliveryCatalog[] } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase
    .from("delivery_catalog")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: (data ?? []) as DeliveryCatalog[] };
}
