import { RPC_FUNCTIONS } from "../db/functions";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult } from "./active.profile.service";

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
    RPC_FUNCTIONS.GET_PURCHASE_REQUEST_VISUALIZATION_COUNT,
    {
      p_profile_id: profile.data.id,
      p_purchase_request_id: purchaseRequestId,
    } as never
  );

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const count = Number(data ?? 0);
  return {
    ok: true,
    data: Number.isFinite(count) ? Math.max(0, count) : 0,
  };
}
