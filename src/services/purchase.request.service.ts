import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { supabase } from "../lib/supabase/client";
import { getProfileByUserId } from "./profile.service";

export type PurchaseRequest = Row<"purchase_request">;
const PURCHASE_REQUEST_SELECT = [
  "id",
  "profile_id",
  "draft_id",
  "category_id",
  "category_path",
  "category_name",
  "title",
  "summary_text",
  "contract",
  "status",
  "created_at",
  "published_at",
  "updated_at",
].join(",");

export async function getPurchaseRequestById(
  purchaseRequestId: string
): Promise<{ ok: true; data: PurchaseRequest } | { ok: false; error: AppError } | null> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const { data, error } = await supabase
    .from("purchase_request")
    .select(PURCHASE_REQUEST_SELECT)
    .eq("id", purchaseRequestId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as PurchaseRequest };
}

export async function getPurchaseRequestByProfileId(
  profileId: string
): Promise<{ ok: true; data: PurchaseRequest } | { ok: false; error: AppError } | null> {
  const visualization = await supabase
    .from("purchase_request_visualization")
    .select("purchase_request_id")
    .eq("profile_id", profileId)
    .not("purchase_request_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(25);

  if (visualization.error) {
    return { ok: false, error: fromSupabaseError(visualization.error) };
  }

  const purchaseRequestIds = (visualization.data ?? [])
    .map((row) => row.purchase_request_id)
    .filter((value): value is string => Boolean(value));
  if (purchaseRequestIds.length === 0) return null;

  for (const purchaseRequestId of purchaseRequestIds) {
    const request = await getPurchaseRequestById(purchaseRequestId);
    if (request?.ok === false) return request;
    if (request) return request;
  }

  return null;
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
