import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { supabase } from "../lib/supabase/client";
import { getProfileByUserId } from "./profile.service";

export type PurchaseRequest = Row<"purchase_request">;

export async function getPurchaseRequestByProfileId(
  profileId: string
): Promise<{ ok: true; data: PurchaseRequest } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from("purchase_request")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data || data.length === 0) return null;
  return { ok: true, data: data[0] as PurchaseRequest };
}

export async function getCurrentUserPurchaseRequest(): Promise<
  { ok: true; data: PurchaseRequest | null } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: true, data: null };

  const request = await getPurchaseRequestByProfileId(profile.data.id);
  if (request?.ok === false) return { ok: false, error: request.error };
  if (!request) return { ok: true, data: null };

  return { ok: true, data: request.data };
}
