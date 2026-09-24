import { RPC_FUNCTIONS } from "../db/functions";
import type { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult } from "./active.profile.service";

type Result<T> = { ok: true; data: T } | { ok: false; error: AppError };

export type SellerRequestOfferConversation = {
  conversationId: string;
  purchaseOfferId: string;
  statusCode: string;
  description: string;
  priceSummary: string | null;
  createdAt: string;
};

async function currentSellerProfileId(): Promise<Result<string>> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };
  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return profile;
  if (!profile) return { ok: false, error: fromAppError("not_found") };
  return { ok: true, data: profile.data.id };
}

export async function getCurrentSellerRequestOfferConversations(
  purchaseRequestId: string
): Promise<Result<SellerRequestOfferConversation[]>> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };
  const profile = await currentSellerProfileId();
  if (!profile.ok) return profile;
  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_SELLER_REQUEST_OFFER_CONVERSATIONS,
    { p_purchase_request_id: purchaseRequestId, p_profile_id: profile.data }
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const rows = Array.isArray(result.data) ? result.data : [];
  return { ok: true, data: rows.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    if (typeof row.conversation_id !== "string" || typeof row.purchase_offer_id !== "string") return [];
    return [{
      conversationId: row.conversation_id,
      purchaseOfferId: row.purchase_offer_id,
      statusCode: typeof row.status_code === "string" ? row.status_code : "",
      description: typeof row.description === "string" ? row.description : "Oferta",
      priceSummary: typeof row.price_summary === "string" ? row.price_summary : null,
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
    }];
  }) };
}

export async function getOrCreateCurrentSellerOfferSeedConversation(
  purchaseRequestId: string
): Promise<Result<Row<"conversation">>> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };
  const profile = await currentSellerProfileId();
  if (!profile.ok) return profile;
  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_OR_CREATE_SELLER_OFFER_SEED_CONVERSATION,
    { p_purchase_request_id: purchaseRequestId, p_profile_id: profile.data }
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const data = result.data as unknown;
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      typeof (data as Record<string, unknown>).id !== "string") {
    return { ok: false, error: fromAppError("not_found") };
  }
  return { ok: true, data: data as Row<"conversation"> };
}

export async function getActiveSellerOfferDraftMode(
  conversationId: string
): Promise<Result<"create" | "batch" | null>> {
  const profile = await currentSellerProfileId();
  if (!profile.ok) return profile;
  const result = await supabase.from("offer_draft")
    .select("mode").eq("conversation_id", conversationId)
    .eq("profile_id", profile.data).in("status", ["draft", "ready"])
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  return { ok: true, data: result.data?.mode === "create" ? "create"
    : result.data?.mode === "batch" ? "batch" : null };
}
