import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

type FaqRow = Row<"faq">;

export type FaqListItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export async function getActiveFaqItems(): Promise<
  { ok: true; data: FaqListItem[] } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase
    .from("faq")
    .select("id,question,answer,sort_order,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const items = ((data ?? []) as FaqRow[]).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
  }));

  return { ok: true, data: items };
}
