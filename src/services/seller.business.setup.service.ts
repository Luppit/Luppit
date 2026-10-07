import { RPC_FUNCTIONS } from "../db/functions";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult } from "./active.profile.service";
import { getPushPermissionStatus } from "./push-notification.service";
import { parseSellerBusinessSetup, SellerBusinessSetup } from "./seller.business.setup.helpers";

export type { SellerBusinessSetup, SellerBusinessSetupStep } from "./seller.business.setup.helpers";

export async function getCurrentSellerBusinessSetup(): Promise<
  { ok: true; data: SellerBusinessSetup } | { ok: false; error: AppError }
> {
  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return profile;
  if (!profile) return { ok: false, error: fromAppError("auth") };

  const permission = await getPushPermissionStatus();
  const result = await supabase.rpc(RPC_FUNCTIONS.GET_CURRENT_SELLER_BUSINESS_SETUP, {
    p_profile_id: profile.data.id,
    p_notifications_enabled: permission.status === "granted",
  });
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const data = parseSellerBusinessSetup(result.data);
  return data ? { ok: true, data } : { ok: false, error: fromAppError("unknown") };
}

export async function requireCurrentSellerBusinessSetup(): Promise<
  { ok: true } | { ok: false; error: AppError }
> {
  const result = await getCurrentSellerBusinessSetup();
  if (!result.ok) return result;
  if (!result.data.isComplete) {
    return { ok: false, error: fromSupabaseError({ message: "seller_business_setup_required" }) };
  }
  return { ok: true };
}
