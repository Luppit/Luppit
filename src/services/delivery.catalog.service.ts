import { RPC_FUNCTIONS } from "../db/functions";
import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromSupabaseError } from "../lib/supabase/errors";

export type DeliveryCatalog = Row<"delivery_catalog"> & {
  method_kind: "shipping" | "pickup";
};

export async function getDeliveryCatalog(): Promise<
  { ok: true; data: DeliveryCatalog[] } | { ok: false; error: AppError }
> {
  const { data, error } = await supabase.rpc(
    RPC_FUNCTIONS.GET_DELIVERY_CATALOG_OPTIONS
  );

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const options: DeliveryCatalog[] = [];
  for (const item of data) {
    if (item.method_kind !== "shipping" && item.method_kind !== "pickup") {
      continue;
    }
    options.push({ ...item, method_kind: item.method_kind });
  }

  return {
    ok: true,
    data: options,
  };
}
