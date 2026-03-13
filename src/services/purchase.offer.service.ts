import { Row } from "../db/types";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";

export type PurchaseOffer = Row<"purchase_offer">;
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

function getFileExtension(file: OfferFile, fallback = "jpg") {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  const fromUri = file.uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUri) return fromUri;

  const fromMime = file.mime?.split("/").pop()?.toLowerCase();
  if (fromMime) return fromMime;

  return fallback;
}

async function uploadOfferImage(
  offerId: string,
  file: OfferFile,
  index: number
): Promise<{ ok: true; data: string } | { ok: false; error: AppError }> {
  const extension = getFileExtension(file);
  const filePath = `${offerId}/${Date.now()}_${index}.${extension}`;

  const response = await fetch(file.uri);
  const body = await response.arrayBuffer();

  const { error } = await supabase.storage.from("offers").upload(filePath, body, {
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

  const deliveryInsert = await supabase
    .from("purchase_offer_delivery")
    .insert({
      delivery_cat_id: input.primaryDeliveryCatalogId,
      after_days: pickupAfterDays,
      max_days: shippingMaxDays,
      price: shippingPrice,
    })
    .select()
    .single();

  if (deliveryInsert.error) {
    return { ok: false, error: fromSupabaseError(deliveryInsert.error) };
  }

  const delivery = deliveryInsert.data as PurchaseOfferDelivery;

  const offerInsert = await supabase
    .from("purchase_offer")
    .insert({
      purchase_request_id: input.purchaseRequestId,
      delivery_id: delivery.id,
      currency_id: input.currencyId,
      description: input.description.trim(),
      price: input.price,
    })
    .select()
    .single();

  if (offerInsert.error) return { ok: false, error: fromSupabaseError(offerInsert.error) };
  const offer = offerInsert.data as PurchaseOffer;

  const uploadedPaths: string[] = [];
  for (let i = 0; i < input.files.length; i += 1) {
    const upload = await uploadOfferImage(offer.id, input.files[i], i);
    if (!upload.ok) return upload;
    uploadedPaths.push(upload.data);
  }

  const imageRows = uploadedPaths.map((path) => ({
    purchase_offer_id: offer.id,
    path,
  }));

  const imageInsert = await supabase
    .from("purchase_offer_image")
    .insert(imageRows)
    .select();

  if (imageInsert.error) return { ok: false, error: fromSupabaseError(imageInsert.error) };

  return {
    ok: true,
    data: {
      offer,
      delivery,
      images: (imageInsert.data ?? []) as PurchaseOfferImage[],
    },
  };
}
