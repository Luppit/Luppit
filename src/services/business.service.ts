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

function isMissingRpcError(error: any, functionName: string) {
  if (!error || error.code !== "PGRST202") return false;
  const message = typeof error.message === "string" ? error.message : "";
  return message.includes(functionName);
}

function getMaskedBusinessDocumentLabel(value: string | null | undefined) {
  const documentValue = value?.trim() ?? "";
  if (!documentValue) return null;

  const digits = documentValue.replace(/\D/g, "");
  return `Registrado${digits ? ` **** ${digits.slice(-4)}` : ""}`;
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

async function getFallbackBusinessIdForBuyerContext({
  profileId,
  conversationId,
  purchaseRequestId,
  purchaseOfferId,
}: {
  profileId: string;
  conversationId: string | null;
  purchaseRequestId: string | null;
  purchaseOfferId: string | null;
}): Promise<{ ok: true; data: string } | { ok: false; error: AppError }> {
  if (conversationId) {
    const conversationResult = await supabase
      .from("conversation")
      .select("purchase_request_id,purchase_offer_id,seller_profile_id")
      .eq("id", conversationId)
      .eq("buyer_profile_id", profileId)
      .maybeSingle();

    if (conversationResult.error) {
      return { ok: false, error: fromSupabaseError(conversationResult.error) };
    }
    if (!conversationResult.data) return { ok: false, error: fromAppError("not_found") };

    const offerId =
      typeof conversationResult.data.purchase_offer_id === "string"
        ? conversationResult.data.purchase_offer_id
        : null;
    const requestId =
      typeof conversationResult.data.purchase_request_id === "string"
        ? conversationResult.data.purchase_request_id
        : null;

    if (offerId) {
      const offerResult = await supabase
        .from("purchase_offer")
        .select("business_id,purchase_request_id")
        .eq("id", offerId)
        .maybeSingle();

      if (offerResult.error) {
        return { ok: false, error: fromSupabaseError(offerResult.error) };
      }

      const businessId =
        typeof offerResult.data?.business_id === "string"
          ? offerResult.data.business_id
          : null;
      const offerRequestId =
        typeof offerResult.data?.purchase_request_id === "string"
          ? offerResult.data.purchase_request_id
          : null;

      if (businessId && (!requestId || offerRequestId === requestId)) {
        return { ok: true, data: businessId };
      }
    }

    const sellerProfileId =
      typeof conversationResult.data.seller_profile_id === "string"
        ? conversationResult.data.seller_profile_id
        : null;
    if (!sellerProfileId) return { ok: false, error: fromAppError("not_found") };

    const profileBusinessResult = await supabase
      .from("profile_business")
      .select("business_id")
      .eq("profile_id", sellerProfileId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (profileBusinessResult.error) {
      return { ok: false, error: fromSupabaseError(profileBusinessResult.error) };
    }

    const businessId =
      typeof profileBusinessResult.data?.business_id === "string"
        ? profileBusinessResult.data.business_id
        : null;
    if (!businessId) return { ok: false, error: fromAppError("not_found") };

    return { ok: true, data: businessId };
  }

  if (!purchaseRequestId || !purchaseOfferId) {
    return { ok: false, error: fromAppError("validation") };
  }

  const requestResult = await supabase
    .from("purchase_request")
    .select("id")
    .eq("id", purchaseRequestId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (requestResult.error) {
    return { ok: false, error: fromSupabaseError(requestResult.error) };
  }
  if (!requestResult.data) return { ok: false, error: fromAppError("not_found") };

  const offerResult = await supabase
    .from("purchase_offer")
    .select("business_id")
    .eq("id", purchaseOfferId)
    .eq("purchase_request_id", purchaseRequestId)
    .maybeSingle();

  if (offerResult.error) {
    return { ok: false, error: fromSupabaseError(offerResult.error) };
  }

  const businessId =
    typeof offerResult.data?.business_id === "string"
      ? offerResult.data.business_id
      : null;
  if (!businessId) return { ok: false, error: fromAppError("not_found") };

  return { ok: true, data: businessId };
}

async function getFallbackBuyerVisibleBusinessOverview({
  profileId,
  conversationId,
  purchaseRequestId,
  purchaseOfferId,
}: {
  profileId: string;
  conversationId: string | null;
  purchaseRequestId: string | null;
  purchaseOfferId: string | null;
}): Promise<
  { ok: true; data: BuyerVisibleBusinessOverview } | { ok: false; error: AppError }
> {
  const businessIdResult = await getFallbackBusinessIdForBuyerContext({
    profileId,
    conversationId,
    purchaseRequestId,
    purchaseOfferId,
  });
  if (!businessIdResult.ok) return businessIdResult;

  const businessResult = await supabase
    .from("business")
    .select("id,name,id_document,created_at,location_id")
    .eq("id", businessIdResult.data)
    .maybeSingle();

  if (businessResult.error) {
    return { ok: false, error: fromSupabaseError(businessResult.error) };
  }
  if (!businessResult.data) return { ok: false, error: fromAppError("not_found") };

  const ratingResult = await supabase
    .from("business_rating_summary")
    .select("rating,num_ratings")
    .eq("business_id", businessResult.data.id)
    .maybeSingle();

  if (ratingResult.error) {
    return { ok: false, error: fromSupabaseError(ratingResult.error) };
  }

  let location: BuyerBusinessLocation | null = null;
  if (businessResult.data.location_id) {
    const locationResult = await supabase
      .from("location")
      .select("id,province,canton,district")
      .eq("id", businessResult.data.location_id)
      .maybeSingle();

    if (locationResult.error) {
      return { ok: false, error: fromSupabaseError(locationResult.error) };
    }

    if (locationResult.data) {
      location = {
        id: locationResult.data.id,
        province: locationResult.data.province,
        canton: locationResult.data.canton,
        district: locationResult.data.district,
      };
    }
  }

  const preferenceResult = await supabase
    .from("business_category_preference")
    .select("id,category_id")
    .eq("business_id", businessResult.data.id);

  if (preferenceResult.error) {
    return { ok: false, error: fromSupabaseError(preferenceResult.error) };
  }

  const preferences = preferenceResult.data ?? [];
  const categoryIds = Array.from(
    new Set(
      preferences
        .map((preference) => preference.category_id)
        .filter((categoryId): categoryId is string => typeof categoryId === "string")
    )
  );
  const categoryById = new Map<string, { name: string; path: string | null }>();

  if (categoryIds.length > 0) {
    const categoryResult = await supabase
      .from("category")
      .select("id,name,path")
      .in("id", categoryIds);

    if (categoryResult.error) {
      return { ok: false, error: fromSupabaseError(categoryResult.error) };
    }

    for (const category of categoryResult.data ?? []) {
      const path = typeof category.path === "string" ? category.path : null;
      categoryById.set(category.id, { name: category.name, path });
    }
  }

  const categories = preferences
    .map((preference) => {
      const category = categoryById.get(preference.category_id);
      if (!category) return null;

      return {
        id: preference.id,
        categoryId: preference.category_id,
        name: category.name,
        path: category.path,
      } satisfies BuyerBusinessCategory;
    })
    .filter((category): category is BuyerBusinessCategory => Boolean(category))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ok: true,
    data: {
      business: {
        id: businessResult.data.id,
        name: businessResult.data.name,
        documentLabel: getMaskedBusinessDocumentLabel(
          businessResult.data.id_document
        ),
        createdAt: businessResult.data.created_at,
        rating: parseNumber(ratingResult.data?.rating),
        numRatings: parseNumber(ratingResult.data?.num_ratings) ?? 0,
        location,
      },
      categories,
      ratingTags: [],
      reviews: [],
    },
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

  const rpcResult: any = await (supabase as any).rpc(
    "get_buyer_visible_business_profile",
    {
      p_profile_id: profileResult.data,
      p_conversation_id: conversationId,
      p_purchase_request_id: purchaseRequestId,
      p_purchase_offer_id: purchaseOfferId,
    }
  );

  if (rpcResult?.error) {
    if (isMissingRpcError(rpcResult.error, "get_buyer_visible_business_profile")) {
      return getFallbackBuyerVisibleBusinessOverview({
        profileId: profileResult.data,
        conversationId,
        purchaseRequestId,
        purchaseOfferId,
      });
    }

    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const parsed = parseBuyerBusinessOverview(rpcResult?.data);
  if (!parsed) return { ok: false, error: fromAppError("not_found") };

  return { ok: true, data: parsed };
}

export async function getBusinessById(
  businessId: string
): Promise<{ ok: true; data: Business } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from("business")
    .select("*")
    .eq("id", businessId)
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
