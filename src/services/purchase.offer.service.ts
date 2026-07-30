import { RPC_FUNCTIONS } from "../db/functions";
import {
  COL_PROFILE,
  COL_PURCHASE_OFFER,
  COL_PURCHASE_OFFER_IMAGE,
  COL_PURCHASE_REQUEST,
  TB_PROFILE,
  TB_PURCHASE_OFFER,
  TB_PURCHASE_OFFER_IMAGE,
  TB_PURCHASE_REQUEST,
} from "../db/tables";
import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import {
  getSignedStorageUrl,
  parseStorageImagePath,
  STORAGE_BUCKETS,
  STORAGE_URI_PREFIX,
  StorageBucket,
  toAbsoluteStorageUrl,
} from "../lib/supabase/storage";
import { getBusinessIdByProfileId } from "./profile.business.service";
import { getCurrentProfileResult } from "./active.profile.service";

export type PurchaseOffer = Row<"purchase_offer">;
export type PurchaseOfferCardData = PurchaseOffer & {
  business_name: string | null;
  business_province: string | null;
  business_rating: number | null;
  business_num_ratings: number | null;
  offer_currency_code: string | null;
  conversation_id?: string | null;
};
export type SellerPurchaseOfferCardData = PurchaseOffer & {
  request_category_id: string | null;
  request_title: string | null;
  request_category_name: string | null;
  request_profile_name: string | null;
  offer_currency_code: string | null;
  conversation_id: string | null;
  conversation_status_code: string | null;
  conversation_status_label: string | null;
  conversation_status_style_code: string | null;
  conversation_status_sort_order: number | null;
  conversation_is_terminal: boolean | null;
};
export type PurchaseOfferImage = Row<"purchase_offer_image">;
type OfferFile = {
  uri: string;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
  isImage?: boolean;
  id?: string | null;
  storagePath?: string | null;
  isExisting?: boolean;
};

export type SellerPurchaseOfferFilters = {
  searchValue?: string;
  startDate?: string;
  endDate?: string;
  selectedCategoryIds?: string[];
  selectedCurrencyIds?: string[];
  selectedConversationStatusCodes?: string[];
};

export type BuyerPurchaseOfferFilters = {
  searchValue?: string;
  startDate?: string;
  endDate?: string;
  selectedCurrencyIds?: string[];
};

export type PurchaseOfferFulfillment = {
  delivery: {
    delivery_catalog_id: string;
    shipping_max_days: number | null;
    shipping_price: number | null;
  } | null;
  pickup: {
    pickup_catalog_id: string;
    pickup_after_days: number | null;
  } | null;
};

export type UpdatePurchaseOfferInput = {
  purchaseRequestId: string;
  purchaseOfferId: string;
  conversationId: string;
  description: string;
  price: number;
  currencyId: string;
  deliveryCatalogId?: string | null;
  pickupCatalogId?: string | null;
  files: OfferFile[];
  pickupAfterDays?: number | null;
  shippingCost?: number | null;
  shippingMaxDays?: number | null;
};

export type UpdatePurchaseOfferResult = {
  offer: PurchaseOffer;
  fulfillment: PurchaseOfferFulfillment;
  images: PurchaseOfferImage[];
};

export type EditablePurchaseOfferDraft = {
  purchaseRequestId: string;
  purchaseOfferId: string;
  description: string;
  price: number;
  currencyId: string;
  deliveryCatalogId: string | null;
  pickupCatalogId: string | null;
  pickupAfterDays: number | null;
  shippingPrice: number | null;
  shippingMaxDays: number | null;
  files: OfferFile[];
};

const purchaseOffersByRequestCache = new Map<string, PurchaseOfferCardData[]>();
const MAX_OFFER_IMAGE_BYTES = 4_000_000;
const ALLOWED_OFFER_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const ALLOWED_OFFER_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
]);
const OFFER_IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function normalizeSellerOfferRequestTitle(value: unknown) {
  if (typeof value !== "string") return null;

  const title = value.trim();
  if (!title) return null;

  const normalizedTitle = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return normalizedTitle === "solicitud" ? null : title;
}

function getRpcItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const items = (payload as Record<string, unknown>).items;
  return Array.isArray(items) ? items : [];
}

async function fillSellerOfferContextFromConversations(
  profileId: string,
  offers: SellerPurchaseOfferCardData[]
) {
  const offerIdsNeedingContext = new Set(
    offers
      .filter(
        (offer) =>
          !normalizeSellerOfferRequestTitle(offer.request_title) ||
          !offer.request_profile_name?.trim()
      )
      .map((offer) => offer.id)
      .filter((id) => typeof id === "string" && id.length > 0)
  );

  if (offerIdsNeedingContext.size === 0) return offers;

  const rpcResult = await supabase.rpc(
    RPC_FUNCTIONS.GET_CURRENT_PROFILE_CONVERSATIONS,
    {
      p_profile_id: profileId,
      p_search_text: null,
      p_start_date: null,
      p_end_date: null,
      p_category_ids: null,
    } as never
  );

  if (rpcResult?.error) return offers;

  const titleByOfferId = new Map<string, string>();
  const buyerNameByOfferId = new Map<string, string>();
  for (const item of getRpcItems(rpcResult?.data)) {
    if (!item || typeof item !== "object") continue;

    const value = item as Record<string, unknown>;
    const offerId = typeof value.purchase_offer_id === "string" ? value.purchase_offer_id : null;
    if (!offerId || !offerIdsNeedingContext.has(offerId)) continue;

    const requestTitle =
      normalizeSellerOfferRequestTitle(value.request_title) ??
      normalizeSellerOfferRequestTitle(value.purchase_request_title) ??
      normalizeSellerOfferRequestTitle(value.title);
    if (requestTitle) titleByOfferId.set(offerId, requestTitle);

    const buyerName =
      typeof value.buyer_profile_name === "string" && value.buyer_profile_name.trim()
        ? value.buyer_profile_name.trim()
        : typeof value.request_profile_name === "string" && value.request_profile_name.trim()
          ? value.request_profile_name.trim()
          : typeof value.display_name === "string" &&
              value.display_name.trim() &&
              value.display_name.trim().toLowerCase() !== "comprador"
            ? value.display_name.trim()
            : null;
    if (buyerName) buyerNameByOfferId.set(offerId, buyerName);
  }

  if (titleByOfferId.size === 0 && buyerNameByOfferId.size === 0) return offers;

  return offers.map((offer) => ({
    ...offer,
    request_title:
      normalizeSellerOfferRequestTitle(offer.request_title) ??
      titleByOfferId.get(offer.id) ??
      null,
    request_profile_name:
      offer.request_profile_name?.trim() || buyerNameByOfferId.get(offer.id) || null,
  }));
}

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
    .from(TB_PURCHASE_OFFER)
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
    .eq(COL_PURCHASE_OFFER.purchase_request_id, purchaseRequestId)
    .order(COL_PURCHASE_OFFER.created_at, { ascending: false });

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
    .from(TB_PURCHASE_OFFER)
    .select("purchase_request_id")
    .in(COL_PURCHASE_OFFER.purchase_request_id, ids);

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

export async function getCurrentBuyerPurchaseRequestOffers(
  purchaseRequestId: string,
  filters?: BuyerPurchaseOfferFilters,
  sortCode = "offer_created_newest"
): Promise<{ ok: true; data: PurchaseOfferCardData[] } | { ok: false; error: AppError }> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult = await supabase.rpc(
    RPC_FUNCTIONS.GET_BUYER_PURCHASE_REQUEST_OFFERS,
    {
      p_profile_id: profile.data.id,
      p_purchase_request_id: purchaseRequestId,
      p_search_text: filters?.searchValue?.trim() || null,
      p_start_date: filters?.startDate?.trim() || null,
      p_end_date: filters?.endDate?.trim() || null,
      p_currency_ids:
        filters?.selectedCurrencyIds && filters.selectedCurrencyIds.length > 0
          ? filters.selectedCurrencyIds
          : null,
      p_sort_code: sortCode || "offer_created_newest",
    } as never
  );

  if (rpcResult?.error) return { ok: false, error: fromSupabaseError(rpcResult.error) };

  const rows = Array.isArray(rpcResult?.data) ? rpcResult.data : [];
  return {
    ok: true,
    data: rows.map((row) => ({
      ...row,
      business_name: typeof row.business_name === "string" ? row.business_name : null,
      business_province:
        typeof row.business_province === "string" ? row.business_province : null,
      business_rating:
        typeof row.business_rating === "number" ? row.business_rating : null,
      business_num_ratings:
        typeof row.business_num_ratings === "number" ? row.business_num_ratings : null,
      offer_currency_code:
        typeof row.offer_currency_code === "string" ? row.offer_currency_code : null,
      conversation_id:
        typeof row.conversation_id === "string" ? row.conversation_id : null,
    })) as PurchaseOfferCardData[],
  };
}

export async function getCurrentSellerPurchaseOffers(
  filters?: SellerPurchaseOfferFilters,
  sortCode = "newly_listed"
): Promise<
  { ok: true; data: SellerPurchaseOfferCardData[] } | { ok: false; error: AppError }
> {
  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult = await supabase.rpc(
    RPC_FUNCTIONS.GET_CURRENT_SELLER_PURCHASE_OFFERS,
    {
      p_profile_id: profile.data.id,
      p_search_text: filters?.searchValue?.trim() || null,
      p_start_date: filters?.startDate?.trim() || null,
      p_end_date: filters?.endDate?.trim() || null,
      p_category_ids:
        filters?.selectedCategoryIds && filters.selectedCategoryIds.length > 0
          ? filters.selectedCategoryIds
          : null,
      p_currency_ids:
        filters?.selectedCurrencyIds && filters.selectedCurrencyIds.length > 0
          ? filters.selectedCurrencyIds
          : null,
      p_sort_code: sortCode || "newly_listed",
      p_conversation_status_codes:
        filters?.selectedConversationStatusCodes &&
        filters.selectedConversationStatusCodes.length > 0
          ? filters.selectedConversationStatusCodes
          : null,
    } as never
  );

  if (!rpcResult?.error) {
    const rows = Array.isArray(rpcResult?.data) ? rpcResult.data : [];
    const parsedRows = rows.map((row) => {
      const compatibilityRow = row as Record<string, unknown>;
      return {
        ...row,
        request_category_id:
          typeof row.request_category_id === "string" ? row.request_category_id : null,
        request_title:
          normalizeSellerOfferRequestTitle(row.request_title) ??
          normalizeSellerOfferRequestTitle(compatibilityRow.purchase_request_title) ??
          normalizeSellerOfferRequestTitle(compatibilityRow.title),
        request_category_name:
          typeof row.request_category_name === "string" ? row.request_category_name : null,
        request_profile_name:
          typeof row.request_profile_name === "string"
            ? row.request_profile_name
            : typeof compatibilityRow.buyer_profile_name === "string"
              ? compatibilityRow.buyer_profile_name
              : null,
        offer_currency_code:
          typeof row.offer_currency_code === "string" ? row.offer_currency_code : null,
        conversation_id:
          typeof row.conversation_id === "string" ? row.conversation_id : null,
        conversation_status_code:
          typeof row.conversation_status_code === "string"
            ? row.conversation_status_code
            : null,
        conversation_status_label:
          typeof row.conversation_status_label === "string"
            ? row.conversation_status_label
            : null,
        conversation_status_style_code:
          typeof row.conversation_status_style_code === "string"
            ? row.conversation_status_style_code
            : null,
        conversation_status_sort_order:
          typeof row.conversation_status_sort_order === "number"
            ? row.conversation_status_sort_order
            : null,
        conversation_is_terminal:
          typeof row.conversation_is_terminal === "boolean"
            ? row.conversation_is_terminal
            : null,
      };
    }) as SellerPurchaseOfferCardData[];

    return {
      ok: true,
      data: await fillSellerOfferContextFromConversations(profile.data.id, parsedRows),
    };
  }

  if (!isMissingRpcError(rpcResult.error, "get_current_seller_purchase_offers")) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const businessRef = await getBusinessIdByProfileId(profile.data.id);
  if (businessRef?.ok === false) return { ok: false, error: businessRef.error };
  if (!businessRef) return { ok: false, error: fromAppError("not_found") };

  const { data, error } = await supabase
    .from(TB_PURCHASE_OFFER)
    .select(
      `
      *,
      currency:currency_id (
        currency_code
      )
    `
    )
    .eq(COL_PURCHASE_OFFER.business_id, businessRef.data)
    .order(COL_PURCHASE_OFFER.created_at, { ascending: false });

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
    {
      requestTitle: string | null;
      categoryId: string | null;
      categoryName: string | null;
      profileId: string | null;
    }
  >();

  if (purchaseRequestIds.length > 0) {
    const requestResult = await supabase
      .from(TB_PURCHASE_REQUEST)
      .select("id, title, category_id, category_name, profile_id")
      .in(COL_PURCHASE_REQUEST.id, purchaseRequestIds);

    if (!requestResult.error) {
      for (const row of requestResult.data ?? []) {
        if (!row?.id) continue;
        requestInfoById.set(row.id, {
          requestTitle: typeof row.title === "string" ? row.title : null,
          categoryId:
            typeof row.category_id === "string" ? row.category_id : null,
          categoryName:
            typeof row.category_name === "string" ? row.category_name : null,
          profileId: typeof row.profile_id === "string" ? row.profile_id : null,
        });
      }
    }
  }

  const profileIds = Array.from(
    new Set(
      Array.from(requestInfoById.values())
        .map((item) => item.profileId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  );

  const profileNameById = new Map<string, string>();
  if (profileIds.length > 0) {
    const profileResult = await supabase
      .from(TB_PROFILE)
      .select("id, name")
      .in(COL_PROFILE.id, profileIds);

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
    const requestProfileName = requestInfo?.profileId
      ? profileNameById.get(requestInfo.profileId) ?? null
      : null;

    return {
      ...offer,
      request_title: requestInfo?.requestTitle ?? null,
      request_category_id: requestInfo?.categoryId ?? null,
      request_category_name: requestInfo?.categoryName ?? null,
      request_profile_name: requestProfileName,
      offer_currency_code: currency?.currency_code ?? null,
      conversation_id: null,
      conversation_status_code: null,
      conversation_status_label: null,
      conversation_status_style_code: null,
      conversation_status_sort_order: null,
      conversation_is_terminal: null,
    } as SellerPurchaseOfferCardData;
  });

  return {
    ok: true,
    data: await fillSellerOfferContextFromConversations(profile.data.id, parsed),
  };
}

export async function getPurchaseOfferById(
  purchaseOfferId: string
): Promise<{ ok: true; data: PurchaseOffer } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from(TB_PURCHASE_OFFER)
    .select("*")
    .eq(COL_PURCHASE_OFFER.id, purchaseOfferId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as PurchaseOffer };
}

function getPathExtension(value: string | null | undefined) {
  const normalized = value?.split("?")[0]?.trim();
  if (!normalized) return null;

  const fileName = normalized.split("/").pop() ?? "";
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return null;
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function getFileExtension(file: OfferFile) {
  const fromName = getPathExtension(file.name);
  if (fromName) return fromName;

  const fromUri = getPathExtension(file.uri);
  if (fromUri) return fromUri;

  const fromMime = file.mime?.split(";")[0]?.split("/").pop()?.trim().toLowerCase();
  if (fromMime) return fromMime;

  return null;
}

function normalizeMimeType(value: string | null | undefined) {
  return value?.split(";")[0]?.trim().toLowerCase() || null;
}

function normalizeJpegMimeType(value: string) {
  return value === "image/jpg" ? "image/jpeg" : value;
}

function validateOfferImage(
  file: OfferFile,
  mimeType = file.mime,
  size = file.size
): { ok: true; extension: string; contentType: string } | { ok: false; error: AppError } {
  if (typeof size === "number" && size > MAX_OFFER_IMAGE_BYTES) {
    return {
      ok: false,
      error: {
        type: "validation",
        code: "offer_image_too_large",
        message: "Cada imagen debe pesar 4 MB o menos.",
      },
    };
  }

  const extension = getFileExtension(file);
  const normalizedMime = normalizeMimeType(mimeType);
  const extensionMime = extension ? OFFER_IMAGE_MIME_BY_EXTENSION[extension] : null;
  if (
    file.isImage === false ||
    !extension ||
    !ALLOWED_OFFER_IMAGE_EXTENSIONS.has(extension) ||
    !normalizedMime ||
    !ALLOWED_OFFER_IMAGE_MIME_TYPES.has(normalizedMime) ||
    !extensionMime ||
    normalizeJpegMimeType(normalizedMime) !== extensionMime
  ) {
    return {
      ok: false,
      error: {
        type: "validation",
        code: "invalid_offer_image",
        message: "Usa una imagen JPG, PNG, WebP o GIF de hasta 4 MB.",
      },
    };
  }

  return { ok: true, extension, contentType: normalizedMime };
}

function getFileNameFromPath(path: string | null | undefined) {
  if (!path) return null;
  const parsedPath = path.startsWith(STORAGE_URI_PREFIX)
    ? parseStorageImagePath(path, STORAGE_BUCKETS.offers).path
    : path;
  const normalized = parsedPath.split("?")[0] ?? parsedPath;
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? null;
}

async function getOfferImagePreviewFiles(
  images: { id?: string | null; path: string }[]
): Promise<OfferFile[]> {
  const files: OfferFile[] = [];

  for (const image of images) {
    const imagePath = image.path;
    const storageImage = parseStorageImagePath(
      imagePath,
      STORAGE_BUCKETS.offers
    );
    const signed = await supabase.storage
      .from(storageImage.bucket)
      .createSignedUrl(storageImage.path, 60 * 60);
    const rawSignedUrl = signed.error ? null : getSignedStorageUrl(signed.data);
    const fallbackPublic = supabase.storage
      .from(storageImage.bucket)
      .getPublicUrl(storageImage.path);
    const previewUri =
      toAbsoluteStorageUrl(rawSignedUrl) ?? fallbackPublic.data.publicUrl ?? imagePath;

    files.push({
      uri: previewUri,
      name: getFileNameFromPath(imagePath),
      mime: null,
      size: null,
      isImage: true,
      id: image.id ?? null,
      storagePath: imagePath,
      isExisting: true,
    });
  }

  return files;
}

async function getPurchaseOfferImagePreviewFiles(
  purchaseOfferId: string
): Promise<{ ok: true; data: OfferFile[] } | { ok: false; error: AppError }> {
  const imageResult = await supabase
    .from(TB_PURCHASE_OFFER_IMAGE)
    .select("id, path")
    .eq(COL_PURCHASE_OFFER_IMAGE.purchase_offer_id, purchaseOfferId)
    .order(COL_PURCHASE_OFFER_IMAGE.created_at, { ascending: true });

  if (imageResult.error) {
    return { ok: false, error: fromSupabaseError(imageResult.error) };
  }

  const imageRows = (imageResult.data ?? [])
    .map((row) => {
      const path = typeof row.path === "string" ? row.path : null;
      if (!path) return null;

      return {
        id: typeof row.id === "string" ? row.id : null,
        path,
      };
    })
    .filter((row): row is { id: string | null; path: string } => row !== null);

  const files = await getOfferImagePreviewFiles(imageRows);
  return { ok: true, data: files };
}

function isMissingRpcError(error: unknown, functionName: string) {
  if (!error || typeof error !== "object") return false;

  const value = error as Record<string, unknown>;
  if (value.code !== "PGRST202") return false;
  const message = typeof value.message === "string" ? value.message : "";
  return message.includes(functionName);
}

function parseNumberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseEditablePurchaseOfferDraft(
  raw: unknown
): EditablePurchaseOfferDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const purchaseRequestId =
    typeof value.purchase_request_id === "string" ? value.purchase_request_id : "";
  const purchaseOfferId =
    typeof value.purchase_offer_id === "string" ? value.purchase_offer_id : "";
  const description = typeof value.description === "string" ? value.description : "";
  const currencyId = typeof value.currency_id === "string" ? value.currency_id : "";
  const price = parseNumberValue(value.price);

  if (!purchaseRequestId || !purchaseOfferId || !currencyId || price == null) {
    return null;
  }

  const rawFiles = Array.isArray(value.files) ? value.files : [];
  const files = rawFiles
    .map((file): OfferFile | null => {
      if (!file || typeof file !== "object") return null;
      const parsed = file as Record<string, unknown>;
      const uri = typeof parsed.uri === "string" ? parsed.uri : "";
      if (!uri) return null;
      const mime = typeof parsed.mime === "string" ? parsed.mime : null;
      const isImage =
        parsed.isImage === true ||
        parsed.is_image === true ||
        (typeof mime === "string" && mime.startsWith("image/"));
      const storagePath =
        typeof parsed.storagePath === "string"
          ? parsed.storagePath
          : typeof parsed.storage_path === "string"
            ? parsed.storage_path
            : typeof parsed.path === "string"
              ? parsed.path
              : uri.startsWith(STORAGE_URI_PREFIX)
                ? uri
                : null;
      return {
        uri,
        name: typeof parsed.name === "string" ? parsed.name : null,
        mime,
        size: parseNumberValue(parsed.size),
        isImage,
        id: typeof parsed.id === "string" ? parsed.id : null,
        storagePath,
        isExisting: parsed.isExisting === true || parsed.is_existing === true,
      };
    })
    .filter((file): file is OfferFile => file !== null);

  const delivery =
    value.delivery && typeof value.delivery === "object"
      ? (value.delivery as Record<string, unknown>)
      : null;
  const pickup =
    value.pickup && typeof value.pickup === "object"
      ? (value.pickup as Record<string, unknown>)
      : null;

  return {
    purchaseRequestId,
    purchaseOfferId,
    description,
    price,
    currencyId,
    deliveryCatalogId:
      typeof delivery?.delivery_catalog_id === "string"
        ? delivery.delivery_catalog_id
        : null,
    pickupCatalogId:
      typeof pickup?.pickup_catalog_id === "string" ? pickup.pickup_catalog_id : null,
    pickupAfterDays: parseNumberValue(pickup?.pickup_after_days),
    shippingPrice: parseNumberValue(delivery?.shipping_price),
    shippingMaxDays: parseNumberValue(delivery?.shipping_max_days),
    files,
  };
}

async function withOfferFilePreviewUrls(files: OfferFile[]) {
  const result: OfferFile[] = [];

  for (const file of files) {
    if (!file.uri.startsWith(STORAGE_URI_PREFIX)) {
      result.push(file);
      continue;
    }

    const storageImage = parseStorageImagePath(
      file.uri,
      STORAGE_BUCKETS.offers
    );
    const signed = await supabase.storage
      .from(storageImage.bucket)
      .createSignedUrl(storageImage.path, 60 * 60);
    const rawSignedUrl = signed.error ? null : getSignedStorageUrl(signed.data);
    const fallbackPublic = supabase.storage
      .from(storageImage.bucket)
      .getPublicUrl(storageImage.path);

    result.push({
      ...file,
      uri: toAbsoluteStorageUrl(rawSignedUrl) ?? fallbackPublic.data.publicUrl ?? file.uri,
      storagePath: file.storagePath ?? file.uri,
    });
  }

  return result;
}

export async function getEditablePurchaseOfferDraftByConversationId(
  conversationId: string
): Promise<{ ok: true; data: EditablePurchaseOfferDraft } | { ok: false; error: AppError } | null> {
  if (!conversationId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const v2RpcResult = await supabase.rpc(
    RPC_FUNCTIONS.GET_SELLER_OFFER_EDIT_PAYLOAD_V2,
    {
      p_conversation_id: conversationId,
      p_profile_id: profile.data.id,
    }
  );

  if (v2RpcResult?.error) {
    return { ok: false, error: fromSupabaseError(v2RpcResult.error) };
  }

  const parsed = parseEditablePurchaseOfferDraft(v2RpcResult?.data);
  if (!parsed) return { ok: false, error: fromAppError("unknown") };

  if (parsed.files.length > 0) {
    return {
      ok: true,
      data: {
        ...parsed,
        files: await withOfferFilePreviewUrls(parsed.files),
      },
    };
  }

  const imageFiles = await getPurchaseOfferImagePreviewFiles(parsed.purchaseOfferId);
  if (!imageFiles.ok) return imageFiles;

  return {
    ok: true,
    data: {
      ...parsed,
      files: imageFiles.data,
    },
  };
}

async function uploadImageToBucket(
  bucket: StorageBucket,
  storagePrefix: string,
  file: OfferFile,
  index: number
): Promise<{ ok: true; data: string } | { ok: false; error: AppError }> {
  const selectedFileValidation = validateOfferImage(file);
  if (!selectedFileValidation.ok) return selectedFileValidation;

  let response: Response;
  let body: ArrayBuffer;
  try {
    response = await fetch(file.uri);
    body = await response.arrayBuffer();
  } catch {
    return { ok: false, error: fromAppError("network") };
  }

  const fetchedContentType =
    normalizeMimeType(response.headers.get("content-type")) ??
    selectedFileValidation.contentType;
  const fetchedFileValidation = validateOfferImage(
    file,
    fetchedContentType,
    body.byteLength
  );
  if (!fetchedFileValidation.ok) return fetchedFileValidation;

  const filePath =
    `${storagePrefix}/${Date.now()}_${index}.${fetchedFileValidation.extension}`;

  const { error } = await supabase.storage.from(bucket).upload(filePath, body, {
    contentType: fetchedFileValidation.contentType,
    upsert: false,
  });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: filePath };
}

function getConversationImageStorageReference(file: OfferFile) {
  const storagePath = file.storagePath?.trim();
  if (!storagePath) return null;
  return storagePath.startsWith(STORAGE_URI_PREFIX)
    ? storagePath
    : `${STORAGE_URI_PREFIX}${STORAGE_BUCKETS.offers}/${storagePath}`;
}

async function removeNewOfferImages(paths: string[]) {
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(STORAGE_BUCKETS.offers).remove(paths);
  } catch {
    return;
  }
}

export async function updatePurchaseOffer(
  input: UpdatePurchaseOfferInput
): Promise<{ ok: true; data: UpdatePurchaseOfferResult } | { ok: false; error: AppError }> {
  if (!input.purchaseRequestId || !input.purchaseOfferId || !input.conversationId) {
    return { ok: false, error: fromAppError("validation") };
  }
  if (!input.description.trim()) {
    return { ok: false, error: fromAppError("validation") };
  }
  if (!input.currencyId || (!input.deliveryCatalogId && !input.pickupCatalogId)) {
    return { ok: false, error: fromAppError("validation") };
  }
  if (input.price <= 0 || input.files.length === 0) {
    return { ok: false, error: fromAppError("validation") };
  }

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const pickupAfterDays =
    input.pickupCatalogId && typeof input.pickupAfterDays === "number"
      ? Math.max(0, Math.trunc(input.pickupAfterDays))
      : null;
  const shippingMaxDays =
    input.deliveryCatalogId && typeof input.shippingMaxDays === "number"
      ? Math.max(0, Math.trunc(input.shippingMaxDays))
      : null;
  const shippingPrice =
    input.deliveryCatalogId && typeof input.shippingCost === "number"
      ? Math.max(0, input.shippingCost)
      : null;

  const existingFiles = input.files.filter((file) => file.isExisting === true);
  const keepOfferImageIds = existingFiles
    .map((file) => (typeof file.id === "string" && file.id.length > 0 ? file.id : null))
    .filter((id): id is string => Boolean(id));

  const offerUploadStoragePrefix = `${input.purchaseRequestId}/${input.conversationId}`;
  const newOfferImagePaths: string[] = [];
  const conversationImagePaths: string[] = [];

  for (let i = 0; i < input.files.length; i += 1) {
    const file = input.files[i];

    if (file.isExisting === true) {
      const existingStorageReference = getConversationImageStorageReference(file);
      if (!existingStorageReference) {
        await removeNewOfferImages(newOfferImagePaths);
        return { ok: false, error: fromAppError("validation") };
      }
      conversationImagePaths.push(existingStorageReference);
      continue;
    }

    const offerUpload = await uploadImageToBucket(
      STORAGE_BUCKETS.offers,
      offerUploadStoragePrefix,
      file,
      i
    );
    if (!offerUpload.ok) {
      await removeNewOfferImages(newOfferImagePaths);
      return offerUpload;
    }

    newOfferImagePaths.push(offerUpload.data);
    conversationImagePaths.push(
      `${STORAGE_URI_PREFIX}${STORAGE_BUCKETS.offers}/${offerUpload.data}`
    );
  }

  const rpcResult = await supabase.rpc(
    RPC_FUNCTIONS.UPDATE_SELLER_OFFER_FULFILLMENT_FROM_CONVERSATION,
    {
      p_conversation_id: input.conversationId,
      p_profile_id: profile.data.id,
      p_description: input.description.trim(),
      p_price: input.price,
      p_currency_id: input.currencyId,
      p_delivery_catalog_id: input.deliveryCatalogId ?? null,
      p_pickup_catalog_id: input.pickupCatalogId ?? null,
      p_pickup_after_days: pickupAfterDays,
      p_shipping_max_days: shippingMaxDays,
      p_shipping_price: shippingPrice,
      p_keep_offer_image_ids: keepOfferImageIds,
      p_new_offer_image_paths: newOfferImagePaths,
      p_conversation_image_paths: conversationImagePaths,
    } as never
  );

  if (rpcResult?.error) {
    const rpcError = fromSupabaseError(rpcResult.error);
    await removeNewOfferImages(newOfferImagePaths);
    return { ok: false, error: rpcError };
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
  const fulfillmentRaw =
    payload.fulfillment && typeof payload.fulfillment === "object"
      ? (payload.fulfillment as PurchaseOfferFulfillment)
      : null;
  if (!offerRaw || !fulfillmentRaw) {
    return { ok: false, error: fromAppError("unknown") };
  }

  const images = Array.isArray(payload.images)
    ? (payload.images as PurchaseOfferImage[])
    : [];

  return {
    ok: true,
    data: {
      offer: offerRaw as PurchaseOffer,
      fulfillment: fulfillmentRaw,
      images,
    },
  };
}
