import { RPC_FUNCTIONS } from "../db/functions";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult, requestActiveProfileRefresh } from "./active.profile.service";
import { getPushPermissionStatus } from "./push-notification.service";
import { parseBuyerProfileSetup, type BuyerProfileSetup } from "./seller.business.setup.helpers";

export type { BuyerProfileSetup } from "./seller.business.setup.helpers";

export async function getCurrentBuyerProfileSetup(): Promise<
  { ok: true; data: BuyerProfileSetup } | { ok: false; error: AppError }
> {
  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return profile;
  if (!profile) return { ok: false, error: fromAppError("auth") };

  const permission = await getPushPermissionStatus();
  const result = await supabase.rpc(RPC_FUNCTIONS.GET_CURRENT_BUYER_PROFILE_SETUP, {
    p_profile_id: profile.data.id,
    p_notifications_enabled: permission.status === "granted",
  });
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const data = parseBuyerProfileSetup(result.data);
  return data ? { ok: true, data } : { ok: false, error: fromAppError("unknown") };
}

export async function updateCurrentBuyerLocation(locationId: string): Promise<
  { ok: true; data: { locationId: string } } | { ok: false; error: AppError }
> {
  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return profile;
  if (!profile) return { ok: false, error: fromAppError("auth") };
  const normalizedLocationId = locationId.trim();
  if (!normalizedLocationId) return { ok: false, error: fromAppError("validation") };

  const result = await supabase.rpc(RPC_FUNCTIONS.SET_CURRENT_PROFILE_LOCATION, {
    p_profile_id: profile.data.id,
    p_location_id: normalizedLocationId,
  });
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  await requestActiveProfileRefresh(profile.data.id);
  return { ok: true, data: { locationId: normalizedLocationId } };
}

export async function requireCurrentBuyerProfileSetup(): Promise<
  { ok: true } | { ok: false; error: AppError }
> {
  const result = await getCurrentBuyerProfileSetup();
  if (!result.ok) return result;
  return result.data.isComplete ? { ok: true } : {
    ok: false, error: fromSupabaseError({ message: "buyer_profile_setup_required" }),
  };
}
