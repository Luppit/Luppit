import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type DeliveryCatalog = Row<"delivery_catalog"> & {
  method_kind: "shipping" | "pickup";
};

export async function getDeliveryCatalog(): Promise<
  { ok: true; data: DeliveryCatalog[] } | { ok: false; error: AppError }
> {
  const { data, error } = await (supabase as any).rpc("get_delivery_catalog_options");

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return {
    ok: true,
    data: (Array.isArray(data) ? data : []).filter(
      (item): item is DeliveryCatalog =>
        item?.method_kind === "shipping" || item?.method_kind === "pickup"
    ),
  };
}
