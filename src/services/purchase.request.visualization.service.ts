import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult } from "./active.profile.service";

export type PurchaseRequestVisualization = Row<"purchase_request_visualization">;

export async function registerPurchaseRequestVisualization(
  purchaseRequestId: string
): Promise<{ ok: true; data: PurchaseRequestVisualization } | { ok: false; error: AppError }> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const existing = await supabase
    .from("purchase_request_visualization")
    .select("*")
    .eq("profile_id", profile.data.id)
    .eq("purchase_request_id", purchaseRequestId)
    .maybeSingle();

  if (existing.error) return { ok: false, error: fromSupabaseError(existing.error) };
  if (existing.data) return { ok: true, data: existing.data as PurchaseRequestVisualization };

  const { data, error } = await supabase
    .from("purchase_request_visualization")
    .insert({
      profile_id: profile.data.id,
      purchase_request_id: purchaseRequestId,
    })
    .select()
    .single();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: data as PurchaseRequestVisualization };
}

export async function getPurchaseRequestVisualizationCount(
  purchaseRequestId: string
): Promise<{ ok: true; data: number } | { ok: false; error: AppError }> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const { data, error } = await supabase.rpc(
    "get_purchase_request_visualization_count",
    {
      p_profile_id: profile.data.id,
      p_purchase_request_id: purchaseRequestId,
    }
  );

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const count = Number(data ?? 0);
  return {
    ok: true,
    data: Number.isFinite(count) ? Math.max(0, count) : 0,
  };
}
