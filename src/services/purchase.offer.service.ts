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
  id?: string | null;
  storagePath?: string | null;
  isExisting?: boolean;
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

export type UpdatePurchaseOfferInput = {
  purchaseRequestId: string;
  purchaseOfferId: string;
  conversationId: string;
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

export type UpdatePurchaseOfferResult = CreatePurchaseOfferResult;

export type EditablePurchaseOfferDraft = {
  purchaseRequestId: string;
  purchaseOfferId: string;
  description: string;
  price: number;
  currencyId: string;
  primaryDeliveryCatalogId: string | null;
  pickupAfterDays: number | null;
  pickupAfterValue: number | null;
  pickupAfterUnit: DeliveryUnit | null;
  shippingPrice: number | null;
  shippingMaxDays: number | null;
  shippingMaxValue: number | null;
  shippingMaxUnit: DeliveryUnit | null;
  files: OfferFile[];
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

function isValidMimeType(value: string | null | undefined) {
  if (!value) return false;
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(value);
}

function getMimeTypeFromExtension(extension: string) {
  switch (extension.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

function resolveUploadContentType(
  file: OfferFile,
  extension: string,
  fetchedContentType?: string | null
): string {
  const normalizedFileMime = file.mime?.split(";")[0]?.trim() ?? null;
  if (normalizedFileMime && isValidMimeType(normalizedFileMime)) return normalizedFileMime;

  const normalizedFetchedMime = fetchedContentType?.split(";")[0]?.trim() ?? null;
  if (normalizedFetchedMime && isValidMimeType(normalizedFetchedMime)) {
    return normalizedFetchedMime;
  }

  return getMimeTypeFromExtension(extension);
}

function getFileNameFromPath(path: string | null | undefined) {
  if (!path) return null;
  const normalized = path.split("?")[0] ?? path;
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? null;
}

function toAbsoluteStorageUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;

  const supabaseBaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? (supabase as any).supabaseUrl ?? "";
  if (!supabaseBaseUrl) return rawUrl;

  const normalizedBase = supabaseBaseUrl.replace(/\/$/, "");
  const normalizedRaw = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;

  if (normalizedRaw.startsWith("/storage/v1/")) {
    return `${normalizedBase}${normalizedRaw}`;
  }

  return `${normalizedBase}/storage/v1${normalizedRaw}`;
}

async function getOfferImagePreviewFiles(
  images: { id?: string | null; path: string }[]
): Promise<OfferFile[]> {
  const files: OfferFile[] = [];

  for (const image of images) {
    const imagePath = image.path;
    const signed = await supabase.storage.from("offers").createSignedUrl(imagePath, 60 * 60);
    const signedData: any = signed.data;
    const rawSignedUrl = signed.error
      ? null
      : signedData?.signedUrl ?? signedData?.signedURL ?? null;
    const fallbackPublic = supabase.storage.from("offers").getPublicUrl(imagePath);
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
    .from("purchase_offer_image")
    .select("id, path")
    .eq("purchase_offer_id", purchaseOfferId)
    .order("created_at", { ascending: true });

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

function isMissingRpcError(error: any, functionName: string) {
  if (!error || error.code !== "PGRST202") return false;
  const message = typeof error.message === "string" ? error.message : "";
  return message.includes(functionName);
}

function parseNumberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseDeliveryUnit(value: unknown): DeliveryUnit | null {
  if (value === "horas" || value === "hours") return "horas";
  if (value === "dias" || value === "days") return "dias";
  return null;
}

function toDbDeliveryUnit(unit: DeliveryUnit | null | undefined) {
  if (unit === "horas") return "hours";
  if (unit === "dias") return "days";
  return null;
}

function getLegacyDays(value: number | null | undefined, unit: DeliveryUnit | null | undefined) {
  if (!value || value <= 0) return null;
  if (unit === "horas") return Math.ceil(value / 24);
  return value;
}

function resolveDeliveryTiming(value: number | null | undefined, unit: DeliveryUnit | undefined) {
  if (!value || value <= 0) {
    return {
      value: null,
      unit: null,
      legacyDays: null,
    };
  }

  return {
    value,
    unit: unit ?? "dias",
    legacyDays: getLegacyDays(value, unit ?? "dias"),
  };
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
      return {
        uri,
        name: typeof parsed.name === "string" ? parsed.name : null,
        mime,
        size: parseNumberValue(parsed.size),
        isImage,
        id: typeof parsed.id === "string" ? parsed.id : null,
        storagePath:
          typeof parsed.storagePath === "string"
            ? parsed.storagePath
            : typeof parsed.storage_path === "string"
              ? parsed.storage_path
              : typeof parsed.path === "string"
                ? parsed.path
                : null,
        isExisting: parsed.isExisting === true || parsed.is_existing === true,
      };
    })
    .filter((file): file is OfferFile => file !== null);

  const pickupAfterDays = parseNumberValue(value.pickup_after_days);
  const shippingMaxDays = parseNumberValue(value.shipping_max_days);
  const pickupAfterUnit = parseDeliveryUnit(value.pickup_after_unit);
  const shippingMaxUnit = parseDeliveryUnit(value.shipping_max_unit);

  return {
    purchaseRequestId,
    purchaseOfferId,
    description,
    price,
    currencyId,
    primaryDeliveryCatalogId:
      typeof value.primary_delivery_catalog_id === "string"
        ? value.primary_delivery_catalog_id
        : null,
    pickupAfterDays,
    pickupAfterValue: parseNumberValue(value.pickup_after_value) ?? pickupAfterDays,
    pickupAfterUnit: pickupAfterUnit ?? (pickupAfterDays && pickupAfterDays > 0 ? "dias" : null),
    shippingPrice: parseNumberValue(value.shipping_price),
    shippingMaxDays,
    shippingMaxValue: parseNumberValue(value.shipping_max_value) ?? shippingMaxDays,
    shippingMaxUnit: shippingMaxUnit ?? (shippingMaxDays && shippingMaxDays > 0 ? "dias" : null),
    files,
  };
}

export async function getEditablePurchaseOfferDraftByConversationId(
  conversationId: string
): Promise<{ ok: true; data: EditablePurchaseOfferDraft } | { ok: false; error: AppError } | null> {
  if (!conversationId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const v2RpcResult: any = await (supabase as any).rpc("get_seller_offer_edit_payload_v2", {
    p_conversation_id: conversationId,
    p_profile_id: profile.data.id,
  });

  if (!v2RpcResult?.error) {
    const parsed = parseEditablePurchaseOfferDraft(v2RpcResult?.data);
    if (parsed) {
      if (parsed.files.length > 0) {
        return { ok: true, data: parsed };
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
  } else if (!isMissingRpcError(v2RpcResult.error, "get_seller_offer_edit_payload_v2")) {
    return { ok: false, error: fromSupabaseError(v2RpcResult.error) };
  }

  const rpcResult: any = await (supabase as any).rpc("get_seller_offer_edit_payload", {
    p_conversation_id: conversationId,
    p_profile_id: profile.data.id,
  });

  if (!rpcResult?.error) {
    const parsed = parseEditablePurchaseOfferDraft(rpcResult?.data);
    if (parsed) {
      if (parsed.files.length > 0) {
        return { ok: true, data: parsed };
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
  } else if (!isMissingRpcError(rpcResult.error, "get_seller_offer_edit_payload")) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const conversationResult = await supabase
    .from("conversation")
    .select("id, purchase_request_id, purchase_offer_id, seller_profile_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationResult.error) {
    return { ok: false, error: fromSupabaseError(conversationResult.error) };
  }

  const conversation = conversationResult.data;
  if (!conversation?.id || conversation.seller_profile_id !== profile.data.id) {
    return null;
  }

  const purchaseOfferId =
    typeof conversation.purchase_offer_id === "string" ? conversation.purchase_offer_id : null;
  const purchaseRequestId =
    typeof conversation.purchase_request_id === "string" ? conversation.purchase_request_id : null;

  if (!purchaseOfferId || !purchaseRequestId) return null;

  const offerResult = await supabase
    .from("purchase_offer")
    .select("*")
    .eq("id", purchaseOfferId)
    .maybeSingle();

  if (offerResult.error) return { ok: false, error: fromSupabaseError(offerResult.error) };
  if (!offerResult.data) return null;

  const deliveryId =
    typeof offerResult.data.delivery_id === "string" ? offerResult.data.delivery_id : null;

  const [deliveryResult, imageResult] = await Promise.all([
    deliveryId
      ? supabase.from("purchase_offer_delivery").select("*").eq("id", deliveryId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getPurchaseOfferImagePreviewFiles(purchaseOfferId),
  ]);

  if (deliveryResult.error) {
    return { ok: false, error: fromSupabaseError(deliveryResult.error) };
  }
  if (!imageResult.ok) {
    return imageResult;
  }

  return {
    ok: true,
    data: {
      purchaseRequestId,
      purchaseOfferId,
      description: offerResult.data.description?.trim() ?? "",
      price: Number(offerResult.data.price ?? 0),
      currencyId: offerResult.data.currency_id ?? "",
      primaryDeliveryCatalogId: deliveryResult.data?.delivery_cat_id ?? null,
      pickupAfterDays: parseNumberValue(deliveryResult.data?.after_days),
      pickupAfterValue:
        parseNumberValue(deliveryResult.data?.after_value) ??
        parseNumberValue(deliveryResult.data?.after_days),
      pickupAfterUnit:
        parseDeliveryUnit(deliveryResult.data?.after_unit) ??
        (parseNumberValue(deliveryResult.data?.after_days) ? "dias" : null),
      shippingPrice: parseNumberValue(deliveryResult.data?.price),
      shippingMaxDays: parseNumberValue(deliveryResult.data?.max_days),
      shippingMaxValue:
        parseNumberValue(deliveryResult.data?.max_value) ??
        parseNumberValue(deliveryResult.data?.max_days),
      shippingMaxUnit:
        parseDeliveryUnit(deliveryResult.data?.max_unit) ??
        (parseNumberValue(deliveryResult.data?.max_days) ? "dias" : null),
      files: imageResult.data,
    },
  };
}

async function syncPurchaseOfferDeliveryTiming(
  conversationId: string,
  profileId: string,
  pickupTiming: ReturnType<typeof resolveDeliveryTiming>,
  shippingTiming: ReturnType<typeof resolveDeliveryTiming>
): Promise<{ ok: true } | { ok: false; error: AppError }> {
  const result: any = await (supabase as any).rpc("set_purchase_offer_delivery_timing", {
    p_conversation_id: conversationId,
    p_profile_id: profileId,
    p_pickup_after_value: pickupTiming.value,
    p_pickup_after_unit: toDbDeliveryUnit(pickupTiming.unit),
    p_shipping_max_value: shippingTiming.value,
    p_shipping_max_unit: toDbDeliveryUnit(shippingTiming.unit),
  });

  if (result?.error) {
    if (isMissingRpcError(result.error, "set_purchase_offer_delivery_timing")) {
      return { ok: true };
    }
    return { ok: false, error: fromSupabaseError(result.error) };
  }

  return { ok: true };
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
  const contentType = resolveUploadContentType(
    file,
    extension,
    response.headers.get("content-type")
  );

  const { error } = await supabase.storage.from(bucket).upload(filePath, body, {
    contentType,
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

  const pickupTiming = resolveDeliveryTiming(
    hasPickup ? input.pickupDelay : null,
    input.pickupDelayUnit
  );
  const shippingTiming = resolveDeliveryTiming(
    hasShipping ? input.shippingMaxTime : null,
    input.shippingMaxTimeUnit
  );

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
      p_pickup_after_days: pickupTiming.legacyDays,
      p_shipping_max_days: shippingTiming.legacyDays,
      p_shipping_price: shippingPrice,
      p_offer_image_paths: uploadedOfferImagePaths,
      p_conversation_image_paths: uploadedConversationImagePaths,
    }
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const timingResult = await syncPurchaseOfferDeliveryTiming(
    input.conversationId,
    profile.data.id,
    pickupTiming,
    shippingTiming
  );
  if (!timingResult.ok) return timingResult;

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

export async function updatePurchaseOffer(
  input: UpdatePurchaseOfferInput
): Promise<{ ok: true; data: UpdatePurchaseOfferResult } | { ok: false; error: AppError }> {
  if (!input.purchaseRequestId || !input.purchaseOfferId || !input.conversationId) {
    return { ok: false, error: fromAppError("validation") };
  }
  if (!input.description.trim()) {
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

  const hasPickup = (input.pickupDelay ?? 0) > 0;
  const hasShipping = (input.shippingMaxTime ?? 0) > 0 || (input.shippingCost ?? 0) > 0;

  const pickupTiming = resolveDeliveryTiming(
    hasPickup ? input.pickupDelay : null,
    input.pickupDelayUnit
  );
  const shippingTiming = resolveDeliveryTiming(
    hasShipping ? input.shippingMaxTime : null,
    input.shippingMaxTimeUnit
  );
  const shippingPrice =
    hasShipping && (input.shippingCost ?? 0) > 0
      ? input.shippingCost ?? null
      : null;

  const existingFiles = input.files.filter((file) => file.isExisting === true);
  const keepOfferImageIds = existingFiles
    .map((file) => (typeof file.id === "string" && file.id.length > 0 ? file.id : null))
    .filter((id): id is string => Boolean(id));

  const offerUploadStoragePrefix = `${input.purchaseRequestId}/${input.conversationId}`;
  const conversationUploadStoragePrefix = input.conversationId;
  const newOfferImagePaths: string[] = [];
  const conversationImagePaths: string[] = [];

  for (let i = 0; i < input.files.length; i += 1) {
    const file = input.files[i];

    if (file.isExisting !== true) {
      const offerUpload = await uploadImageToBucket(
        "offers",
        offerUploadStoragePrefix,
        file,
        i
      );
      if (!offerUpload.ok) return offerUpload;
      newOfferImagePaths.push(offerUpload.data);
    }

    const conversationUpload = await uploadImageToBucket(
      "conversations",
      conversationUploadStoragePrefix,
      file,
      i
    );
    if (!conversationUpload.ok) return conversationUpload;
    conversationImagePaths.push(conversationUpload.data);
  }

  const rpcResult: any = await (supabase as any).rpc(
    "update_seller_offer_from_conversation",
    {
      p_conversation_id: input.conversationId,
      p_profile_id: profile.data.id,
      p_description: input.description.trim(),
      p_price: input.price,
      p_currency_id: input.currencyId,
      p_primary_delivery_catalog_id: input.primaryDeliveryCatalogId,
      p_pickup_after_days: pickupTiming.legacyDays,
      p_shipping_max_days: shippingTiming.legacyDays,
      p_shipping_price: shippingPrice,
      p_keep_offer_image_ids: keepOfferImageIds,
      p_new_offer_image_paths: newOfferImagePaths,
      p_conversation_image_paths: conversationImagePaths,
    }
  );

  if (rpcResult?.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const timingResult = await syncPurchaseOfferDeliveryTiming(
    input.conversationId,
    profile.data.id,
    pickupTiming,
    shippingTiming
  );
  if (!timingResult.ok) return timingResult;

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
