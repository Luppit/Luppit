import { RPC_FUNCTIONS } from "../db/functions";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult } from "./active.profile.service";
import { getPushPermissionStatus } from "./push-notification.service";
import { parsePendingSellerBusinessSetup, parseSellerBusinessSetup, parseSellerLocationAvailability, type PendingSellerBusinessSetup, type SellerBusinessSetup, type SellerLocationAvailability } from "./seller.business.setup.helpers";

export type { PendingSellerBusinessSetup, SellerBusinessSetup, SellerBusinessSetupStep } from "./seller.business.setup.helpers";
export type { SellerLocationAvailability } from "./seller.business.setup.helpers";

export async function getCurrentSellerLocationAvailability(): Promise<
  { ok: true; data: SellerLocationAvailability } | { ok: false; error: AppError }
> {
  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return profile;
  if (!profile) return { ok: false, error: fromAppError("auth") };
  const result = await supabase.rpc(RPC_FUNCTIONS.GET_CURRENT_SELLER_LOCATION_AVAILABILITY, {
    p_profile_id: profile.data.id,
  });
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const data = parseSellerLocationAvailability(result.data);
  return data ? { ok: true, data } : { ok: false, error: fromAppError("unknown") };
}

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

export async function getCurrentPendingSellerBusinessSetup(): Promise<
  { ok: true; data: PendingSellerBusinessSetup | null } | { ok: false; error: AppError }
> {
  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return profile;
  if (!profile) return { ok: false, error: fromAppError("auth") };

  const result = await supabase.rpc(RPC_FUNCTIONS.GET_CURRENT_PENDING_SELLER_BUSINESS_SETUP, {
    p_profile_id: profile.data.id,
  });
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  if (result.data === null) return { ok: true, data: null };
  const setup = parsePendingSellerBusinessSetup(result.data);
  return setup ? { ok: true, data: setup } : { ok: false, error: fromAppError("unknown") };
}
