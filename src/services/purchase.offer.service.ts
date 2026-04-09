import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getBusinessIdByProfileId } from "./profile.business.service";
import { getProfileByUserId } from "./profile.service";

export type PurchaseOffer = Row<"purchase_offer">;
export type PurchaseOfferCardData = PurchaseOffer & {
  business_name: string | null;
  business_province: string | null;
  business_rating: number | null;
  business_num_ratings: number | null;
  offer_currency_code: string | null;
};
export type SellerPurchaseOfferCardData = PurchaseOffer & {
  request_title: string | null;
  request_category_name: string | null;
  request_profile_name: string | null;
  offer_currency_code: string | null;
};
export type PurchaseOfferDelivery = Row<"purchase_offer_delivery">;
export type PurchaseOfferImage = Row<"purchase_offer_image">;
type DeliveryUnit = "horas" | "dias";
type OfferFile = {
  uri: string;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
  isImage?: boolean;
};

export type CreatePurchaseOfferInput = {
  purchaseRequestId: string;
  conversationId?: string | null;
  description: string;
  price: number;
  currencyId: string;
  primaryDeliveryCatalogId: string;
  files: OfferFile[];
  deliveryMethods: string[];
  pickupDelay?: number | null;
  pickupDelayUnit?: DeliveryUnit;
  shippingCost?: number | null;
  shippingMaxTime?: number | null;
  shippingMaxTimeUnit?: DeliveryUnit;
};

export type CreatePurchaseOfferResult = {
  offer: PurchaseOffer;
  delivery: PurchaseOfferDelivery;
  images: PurchaseOfferImage[];
};

const purchaseOffersByRequestCache = new Map<string, PurchaseOfferCardData[]>();

export function getCachedPurchaseOffersByPurchaseRequestId(
  purchaseRequestId: string
): PurchaseOfferCardData[] | null {
  return purchaseOffersByRequestCache.get(purchaseRequestId) ?? null;
}

export async function getPurchaseOffersByPurchaseRequestId(
  purchaseRequestId: string,
  options?: { forceRefresh?: boolean }
): Promise<{ ok: true; data: PurchaseOfferCardData[] } | { ok: false; error: AppError }> {
  if (!options?.forceRefresh) {
    const cached = getCachedPurchaseOffersByPurchaseRequestId(purchaseRequestId);
    if (cached) return { ok: true, data: cached };
  }

  const { data, error } = await supabase
    .from("purchase_offer")
    .select(
      `
      *,
      business:business_with_rating!purchase_offer_business_id_fkey (
        name,
        rating,
        num_ratings,
        location:location_id (
          province
        )
      ),
      currency:currency_id (
        currency_code
      )
    `
    )
    .eq("purchase_request_id", purchaseRequestId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: fromSupabaseError(error) };

  type RawBusiness = {
    name?: string | null;
    rating?: number | null;
    num_ratings?: number | null;
    location?: { province?: string | null } | { province?: string | null }[] | null;
  };
  type RawCurrency = { currency_code?: string | null };
  type RawOfferWithRelations = PurchaseOffer & {
    business?: RawBusiness | RawBusiness[] | null;
    currency?: RawCurrency | RawCurrency[] | null;
  };

  const parsed = ((data ?? []) as RawOfferWithRelations[]).map((offer) => {
    const business = Array.isArray(offer.business) ? offer.business[0] : offer.business;
    const location = Array.isArray(business?.location)
      ? business?.location[0]
      : business?.location;
    const currency = Array.isArray(offer.currency) ? offer.currency[0] : offer.currency;

    return {
      ...offer,
      business_name: business?.name ?? null,
      business_province: location?.province ?? null,
      business_rating: business?.rating ?? null,
      business_num_ratings: business?.num_ratings ?? null,
      offer_currency_code: currency?.currency_code ?? null,
    } as PurchaseOfferCardData;
  });

  purchaseOffersByRequestCache.set(purchaseRequestId, parsed);
  return { ok: true, data: parsed };
}

export async function getPurchaseOffersCountByPurchaseRequestId(
  purchaseRequestId: string
): Promise<{ ok: true; data: number } | { ok: false; error: AppError }> {
  const offers = await getPurchaseOffersByPurchaseRequestId(purchaseRequestId);
  if (!offers.ok) return offers;
  return { ok: true, data: offers.data.length };
}

export async function getPurchaseOffersCountByPurchaseRequestIds(
  purchaseRequestIds: string[]
): Promise<{ ok: true; data: Record<string, number> } | { ok: false; error: AppError }> {
  const ids = Array.from(new Set(purchaseRequestIds.filter((id) => typeof id === "string" && id)));
  if (ids.length === 0) return { ok: true, data: {} };

  const { data, error } = await supabase
    .from("purchase_offer")
    .select("purchase_request_id")
    .in("purchase_request_id", ids);

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const counts: Record<string, number> = {};
  for (const id of ids) counts[id] = 0;

  for (const row of data ?? []) {
    const requestId =
      typeof row.purchase_request_id === "string" ? row.purchase_request_id : null;
    if (!requestId) continue;
    counts[requestId] = (counts[requestId] ?? 0) + 1;
  }

  return { ok: true, data: counts };
}

export async function getCurrentSellerPurchaseOffers(): Promise<
  { ok: true; data: SellerPurchaseOfferCardData[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const businessRef = await getBusinessIdByProfileId(profile.data.id);
  if (businessRef?.ok === false) return { ok: false, error: businessRef.error };
  if (!businessRef) return { ok: false, error: fromAppError("not_found") };

  const { data, error } = await supabase
    .from("purchase_offer")
    .select(
      `
      *,
      currency:currency_id (
        currency_code
      )
    `
    )
    .eq("business_id", businessRef.data)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: fromSupabaseError(error) };

  type RawCurrency = { currency_code?: string | null };
  type RawOfferWithRelations = PurchaseOffer & {
    currency?: RawCurrency | RawCurrency[] | null;
  };

  const rawOffers = (data ?? []) as RawOfferWithRelations[];

  const purchaseRequestIds = Array.from(
    new Set(
      rawOffers
        .map((offer) => offer.purchase_request_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const requestInfoById = new Map<
    string,
    { requestTitle: string | null; categoryName: string | null; profileId: string | null }
  >();

  if (purchaseRequestIds.length > 0) {
    const requestResult = await supabase
      .from("purchase_request")
      .select("id, title, category_name, profile_id")
      .in("id", purchaseRequestIds);

    if (!requestResult.error) {
      for (const row of requestResult.data ?? []) {
        if (!row?.id) continue;
        requestInfoById.set(row.id, {
          requestTitle: typeof row.title === "string" ? row.title : null,
          categoryName:
            typeof row.category_name === "string" ? row.category_name : null,
          profileId: typeof row.profile_id === "string" ? row.profile_id : null,
        });
      }
    }
  }

  const visualizationProfileIdByRequestId = new Map<string, string>();

  if (purchaseRequestIds.length > 0) {
    const visualizationResult = await supabase
      .from("purchase_request_visualization")
      .select("purchase_request_id, profile_id, created_at")
      .in("purchase_request_id", purchaseRequestIds)
      .order("created_at", { ascending: false });

    if (!visualizationResult.error) {
      for (const row of visualizationResult.data ?? []) {
        const requestId =
          typeof row.purchase_request_id === "string" ? row.purchase_request_id : null;
        const profileId =
          typeof row.profile_id === "string" ? row.profile_id : null;
        if (!requestId || !profileId) continue;
        if (!visualizationProfileIdByRequestId.has(requestId)) {
          visualizationProfileIdByRequestId.set(requestId, profileId);
        }
      }
    }
  }

  const profileIds = Array.from(
    new Set(
      [
        ...Array.from(visualizationProfileIdByRequestId.values()),
        ...Array.from(requestInfoById.values())
          .map((item) => item.profileId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ].filter((id): id is string => id.length > 0)
    )
  );

  const profileNameById = new Map<string, string>();
  if (profileIds.length > 0) {
    const profileResult = await supabase
      .from("profile")
      .select("id, name")
      .in("id", profileIds);

    if (!profileResult.error) {
      for (const row of profileResult.data ?? []) {
        if (!row?.id || typeof row.name !== "string") continue;
        const name = row.name.trim();
        if (!name) continue;
        profileNameById.set(row.id, name);
      }
    }
  }

  const parsed = rawOffers.map((offer) => {
    const currency = Array.isArray(offer.currency) ? offer.currency[0] : offer.currency;
    const requestId = offer.purchase_request_id;
    const requestInfo =
      typeof requestId === "string" ? requestInfoById.get(requestId) : undefined;
    const profileIdFromVisualization =
      typeof requestId === "string"
        ? visualizationProfileIdByRequestId.get(requestId)
        : undefined;
    const resolvedProfileId = profileIdFromVisualization ?? requestInfo?.profileId ?? null;
    const requestProfileName = resolvedProfileId
      ? profileNameById.get(resolvedProfileId) ?? null
      : null;

    return {
      ...offer,
      request_title: requestInfo?.requestTitle ?? null,
      request_category_name: requestInfo?.categoryName ?? null,
      request_profile_name: requestProfileName,
      offer_currency_code: currency?.currency_code ?? null,
    } as SellerPurchaseOfferCardData;
  });

  return { ok: true, data: parsed };
}

export async function getPurchaseOfferById(
  purchaseOfferId: string
): Promise<{ ok: true; data: PurchaseOffer } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from("purchase_offer")
    .select("*")
    .eq("id", purchaseOfferId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as PurchaseOffer };
}

function getFileExtension(file: OfferFile, fallback = "jpg") {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  const fromUri = file.uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUri) return fromUri;

  const fromMime = file.mime?.split("/").pop()?.toLowerCase();
  if (fromMime) return fromMime;

  return fallback;
}

async function uploadImageToBucket(
  bucket: "offers" | "conversations",
  storagePrefix: string,
  file: OfferFile,
  index: number
): Promise<{ ok: true; data: string } | { ok: false; error: AppError }> {
  const extension = getFileExtension(file);
  const filePath = `${storagePrefix}/${Date.now()}_${index}.${extension}`;

  const response = await fetch(file.uri);
  const body = await response.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(filePath, body, {
    contentType: file.mime ?? undefined,
    upsert: false,
  });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: filePath };
}

export async function createPurchaseOffer(
  input: CreatePurchaseOfferInput
): Promise<{ ok: true; data: CreatePurchaseOfferResult } | { ok: false; error: AppError }> {
  if (!input.purchaseRequestId || !input.description.trim()) {
    return { ok: false, error: fromAppError("validation") };
  }
  if (!input.currencyId || !input.primaryDeliveryCatalogId) {
    return { ok: false, error: fromAppError("validation") };
  }
  if (input.price <= 0 || input.files.length === 0 || input.deliveryMethods.length === 0) {
    return { ok: false, error: fromAppError("validation") };
  }

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  if (!input.conversationId) {
    return { ok: false, error: fromAppError("validation") };
  }
  
  const hasPickup = (input.pickupDelay ?? 0) > 0;
  const hasShipping = (input.shippingMaxTime ?? 0) > 0 || (input.shippingCost ?? 0) > 0;

  const pickupAfterDays =
    hasPickup
      ? input.pickupDelay ?? null
      : null;

  const shippingMaxDays =
    hasShipping && (input.shippingMaxTime ?? 0) > 0
      ? input.shippingMaxTime ?? null
      : null;

  const shippingPrice =
    hasShipping && (input.shippingCost ?? 0) > 0
      ? input.shippingCost ?? null
      : null;

  const offerUploadStoragePrefix = `${input.purchaseRequestId}/${input.conversationId}`;
  const conversationUploadStoragePrefix = input.conversationId;
  const uploadedOfferImagePaths: string[] = [];
  const uploadedConversationImagePaths: string[] = [];
  for (let i = 0; i < input.files.length; i += 1) {
    const offerUpload = await uploadImageToBucket(
      "offers",
      offerUploadStoragePrefix,
      input.files[i],
      i
    );
    if (!offerUpload.ok) return offerUpload;
    uploadedOfferImagePaths.push(offerUpload.data);

    const conversationUpload = await uploadImageToBucket(
      "conversations",
      conversationUploadStoragePrefix,
      input.files[i],
      i
    );
    if (!conversationUpload.ok) return conversationUpload;
    uploadedConversationImagePaths.push(conversationUpload.data);
  }

  const rpcResult: any = await (supabase as any).rpc(
    "create_seller_offer_from_conversation",
    {
      p_conversation_id: input.conversationId,
      p_profile_id: profile.data.id,
      p_description: input.description.trim(),
      p_price: input.price,
      p_currency_id: input.currencyId,
      p_primary_delivery_catalog_id: input.primaryDeliveryCatalogId,
      p_pickup_after_days: pickupAfterDays,
      p_shipping_max_days: shippingMaxDays,
      p_shipping_price: shippingPrice,
      p_offer_image_paths: uploadedOfferImagePaths,
      p_conversation_image_paths: uploadedConversationImagePaths,
    }
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const payload =
    rpcResult?.data && typeof rpcResult.data === "object" && !Array.isArray(rpcResult.data)
      ? (rpcResult.data as Record<string, unknown>)
      : null;
  if (!payload) return { ok: false, error: fromAppError("unknown") };

  const offerRaw =
    payload.offer && typeof payload.offer === "object"
      ? (payload.offer as Record<string, unknown>)
      : null;
  const deliveryRaw =
    payload.delivery && typeof payload.delivery === "object"
      ? (payload.delivery as Record<string, unknown>)
      : null;
  if (!offerRaw || !deliveryRaw) return { ok: false, error: fromAppError("unknown") };

  const images = Array.isArray(payload.images)
    ? (payload.images as PurchaseOfferImage[])
    : [];

  return {
    ok: true,
    data: {
      offer: offerRaw as PurchaseOffer,
      delivery: deliveryRaw as PurchaseOfferDelivery,
      images,
    },
  };
}
