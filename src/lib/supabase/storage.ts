import { supabasePublicUrl } from "./client";

export const STORAGE_BUCKETS = {
  conversations: "conversations",
  offers: "offers",
  profileImages: "profile-images",
  profileImageStaging: "profile-image-staging",
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

export const STORAGE_URI_PREFIX = "storage://";

export function createStorageImagePath(bucket: StorageBucket, path: string) {
  return `${STORAGE_URI_PREFIX}${bucket}/${path}`;
}

export function parseStorageImagePath(
  imagePath: string,
  fallbackBucket: StorageBucket
) {
  if (!imagePath.startsWith(STORAGE_URI_PREFIX)) {
    return { bucket: fallbackBucket, path: imagePath };
  }

  const withoutScheme = imagePath.slice(STORAGE_URI_PREFIX.length);
  const slashIndex = withoutScheme.indexOf("/");
  if (slashIndex <= 0 || slashIndex === withoutScheme.length - 1) {
    return { bucket: fallbackBucket, path: imagePath };
  }

  return {
    bucket: withoutScheme.slice(0, slashIndex),
    path: withoutScheme.slice(slashIndex + 1),
  };
}

export function getSignedStorageUrl(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const value = data as Record<string, unknown>;
  if (typeof value.signedUrl === "string") return value.signedUrl;
  return typeof value.signedURL === "string" ? value.signedURL : null;
}

export function toAbsoluteStorageUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  if (!supabasePublicUrl) return rawUrl;

  const normalizedBase = supabasePublicUrl.replace(/\/$/, "");
  const normalizedRaw = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;

  if (normalizedRaw.startsWith("/storage/v1/")) {
    return `${normalizedBase}${normalizedRaw}`;
  }

  return `${normalizedBase}/storage/v1${normalizedRaw}`;
}
