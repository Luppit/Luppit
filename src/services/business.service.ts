import { RPC_FUNCTIONS } from "../db/functions";
import { COL_BUSINESS, TB_BUSINESS } from "../db/tables";
import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getCurrentProfileResult } from "./active.profile.service";

export type Business = Row<"business">;

export type BuyerBusinessCategory = {
  id: string;
  categoryId: string;
  name: string;
  path: string | null;
};

export type BuyerBusinessLocation = {
  id: string;
  province: string | null;
  canton: string | null;
  district: string | null;
};

export type BuyerBusinessRatingTag = {
  label: string;
  count: number;
};

export type BuyerBusinessReview = {
  id: string;
  stars: number;
  comment: string;
  tags: string[];
  createdAt: string;
};

export type BuyerVisibleBusinessOverview = {
  business: {
    id: string;
    name: string | null;
    documentLabel: string | null;
    createdAt: string;
    rating: number | null;
    numRatings: number;
    location: BuyerBusinessLocation | null;
  };
  categories: BuyerBusinessCategory[];
  ratingTags: BuyerBusinessRatingTag[];
  reviews: BuyerBusinessReview[];
};

async function getCurrentAuthenticatedProfileId(): Promise<
  { ok: true; data: string } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  return { ok: true, data: profile.data.id };
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );
}

function parseBuyerBusinessOverview(
  raw: unknown
): BuyerVisibleBusinessOverview | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as Record<string, unknown>;
  const business =
    payload.business && typeof payload.business === "object"
      ? (payload.business as Record<string, unknown>)
      : null;

  const businessId = typeof business?.id === "string" ? business.id : "";
  const createdAt = typeof business?.created_at === "string" ? business.created_at : "";
  if (!businessId || !createdAt) return null;

  const location =
    business?.location && typeof business.location === "object"
      ? (business.location as Record<string, unknown>)
      : null;
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  const ratingTags = Array.isArray(payload.rating_tags) ? payload.rating_tags : [];
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  const parsedRating = parseNumber(business?.rating);
  const parsedNumRatings = parseNumber(business?.num_ratings);

  return {
    business: {
      id: businessId,
      name: typeof business?.name === "string" ? business.name : null,
      documentLabel:
        typeof business?.document_label === "string"
          ? business.document_label
          : null,
      createdAt,
      rating: parsedRating,
      numRatings: parsedNumRatings ?? 0,
      location:
        location && typeof location.id === "string"
          ? {
              id: location.id,
              province:
                typeof location.province === "string" ? location.province : null,
              canton: typeof location.canton === "string" ? location.canton : null,
              district:
                typeof location.district === "string" ? location.district : null,
            }
          : null,
    },
    categories: categories
      .map((category) => {
        if (!category || typeof category !== "object") return null;
        const value = category as Record<string, unknown>;
        const id = typeof value.id === "string" ? value.id : "";
        const categoryId =
          typeof value.category_id === "string" ? value.category_id : "";
        const name = typeof value.name === "string" ? value.name : "";
        if (!id || !categoryId || !name) return null;

        return {
          id,
          categoryId,
          name,
          path: typeof value.path === "string" ? value.path : null,
        } satisfies BuyerBusinessCategory;
      })
      .filter((category): category is BuyerBusinessCategory => Boolean(category)),
    ratingTags: ratingTags
      .map((tag) => {
        if (!tag || typeof tag !== "object") return null;
        const value = tag as Record<string, unknown>;
        const label = typeof value.label === "string" ? value.label.trim() : "";
        const count = parseNumber(value.count);
        if (!label || count == null) return null;

        return { label, count } satisfies BuyerBusinessRatingTag;
      })
      .filter((tag): tag is BuyerBusinessRatingTag => Boolean(tag)),
    reviews: reviews
      .map((review) => {
        if (!review || typeof review !== "object") return null;
        const value = review as Record<string, unknown>;
        const id = typeof value.id === "string" ? value.id : "";
        const stars = parseNumber(value.stars);
        const comment = typeof value.comment === "string" ? value.comment.trim() : "";
        const createdAt =
          typeof value.created_at === "string" ? value.created_at : "";
        if (!id || !comment || !createdAt || stars == null) return null;

        return {
          id,
          stars,
          comment,
          createdAt,
          tags: parseStringArray(value.tags),
        } satisfies BuyerBusinessReview;
      })
      .filter((review): review is BuyerBusinessReview => Boolean(review)),
  };
}

async function getCurrentBuyerVisibleBusinessOverview(
  args:
    | { conversationId: string; purchaseRequestId?: never; purchaseOfferId?: never }
    | { conversationId?: never; purchaseRequestId: string; purchaseOfferId: string }
): Promise<
  { ok: true; data: BuyerVisibleBusinessOverview } | { ok: false; error: AppError }
> {
  const profileResult = await getCurrentAuthenticatedProfileId();
  if (!profileResult.ok) return profileResult;

  const conversationId =
    "conversationId" in args ? args.conversationId?.trim() || null : null;
  const purchaseRequestId =
    "purchaseRequestId" in args ? args.purchaseRequestId?.trim() || null : null;
  const purchaseOfferId =
    "purchaseOfferId" in args ? args.purchaseOfferId?.trim() || null : null;

  const rpcArgs = conversationId
    ? {
        p_profile_id: profileResult.data,
        p_conversation_id: conversationId,
      }
    : purchaseRequestId && purchaseOfferId
      ? {
          p_profile_id: profileResult.data,
          p_purchase_request_id: purchaseRequestId,
          p_purchase_offer_id: purchaseOfferId,
        }
      : null;

  if (!rpcArgs) return { ok: false, error: fromAppError("validation") };

  const { data, error } = await supabase.rpc(
    RPC_FUNCTIONS.GET_BUYER_VISIBLE_BUSINESS_PROFILE,
    rpcArgs
  );

  if (error) {
    return { ok: false, error: fromSupabaseError(error) };
  }

  const parsed = parseBuyerBusinessOverview(data);
  if (!parsed) return { ok: false, error: fromAppError("not_found") };

  return { ok: true, data: parsed };
}

export async function getBusinessById(
  businessId: string
): Promise<{ ok: true; data: Business } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from(TB_BUSINESS)
    .select("*")
    .eq(COL_BUSINESS.id, businessId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as Business };
}

export async function getCurrentBuyerVisibleBusinessOverviewByConversation(
  conversationId: string
): Promise<
  { ok: true; data: BuyerVisibleBusinessOverview } | { ok: false; error: AppError }
> {
  if (!conversationId.trim()) return { ok: false, error: fromAppError("validation") };

  return getCurrentBuyerVisibleBusinessOverview({ conversationId });
}

export async function getCurrentBuyerVisibleBusinessOverviewByOffer(
  purchaseRequestId: string,
  purchaseOfferId: string
): Promise<
  { ok: true; data: BuyerVisibleBusinessOverview } | { ok: false; error: AppError }
> {
  if (!purchaseRequestId.trim() || !purchaseOfferId.trim()) {
    return { ok: false, error: fromAppError("validation") };
  }

  return getCurrentBuyerVisibleBusinessOverview({
    purchaseRequestId,
    purchaseOfferId,
  });
}
