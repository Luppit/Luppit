import { RPC_FUNCTIONS } from "../db/functions";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult } from "./active.profile.service";
import { resolveProfileImageUrl } from "./profile-image.service";

export type SellerVisibleBuyerProfile = {
  buyer: {
    name: string;
    imagePath: string | null;
    imageUrl: string | null;
    rating: number | null;
    numRatings: number;
  };
};

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getCurrentSellerVisibleBuyerProfile(
  conversationId: string
): Promise<
  { ok: true; data: SellerVisibleBuyerProfile } | { ok: false; error: AppError }
> {
  if (!conversationId.trim()) return { ok: false, error: fromAppError("validation") };
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };
  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return profile;
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_SELLER_VISIBLE_BUYER_PROFILE,
    { p_profile_id: profile.data.id, p_conversation_id: conversationId } as never
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const payload = result.data as Record<string, unknown> | null;
  const buyer = payload?.buyer as Record<string, unknown> | undefined;
  if (!buyer || typeof buyer.name !== "string") {
    return { ok: false, error: fromAppError("not_found") };
  }
  const imagePath = typeof buyer.image_path === "string" ? buyer.image_path : null;

  return {
    ok: true,
    data: {
      buyer: {
        name: buyer.name,
        imagePath,
        imageUrl: await resolveProfileImageUrl(imagePath),
        rating: numberValue(buyer.rating),
        numRatings: numberValue(buyer.num_ratings) ?? 0,
      },
    },
  };
}
