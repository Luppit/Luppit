import type { AppError } from "../lib/supabase/errors";

export const MAX_PROFILE_IMAGE_BYTES = 4_000_000;

export const PROFILE_IMAGE_MIME_BY_EXTENSION = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type ProfileImageExtension = keyof typeof PROFILE_IMAGE_MIME_BY_EXTENSION;
export type ProfileImageMimeType =
  (typeof PROFILE_IMAGE_MIME_BY_EXTENSION)[ProfileImageExtension];
export type ProfileImageKind = "buyer_profile" | "business";

export type ProfileImageFile = {
  uri: string;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
};

export type ValidatedProfileImage = {
  extension: ProfileImageExtension;
  contentType: ProfileImageMimeType;
};

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

type ProfileImageValidationResult =
  | { ok: true; data: ValidatedProfileImage }
  | { ok: false; error: AppError };

export function getProfileImageFunctionErrorCode(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const candidate =
    typeof record.error_code === "string"
      ? record.error_code
      : typeof record.code === "string"
        ? record.code
        : null;
  const normalized = candidate?.trim();
  if (!normalized) return null;

  return normalized.toUpperCase() === "NOT_FOUND"
    ? "profile_image_function_not_deployed"
    : normalized;
}

const INVALID_IMAGE_ERROR: AppError = {
  type: "validation",
  code: "invalid_profile_image",
  message: "Usa una imagen JPG, PNG o WebP de hasta 4 MB.",
};

const OVERSIZED_IMAGE_ERROR: AppError = {
  type: "validation",
  code: "profile_image_too_large",
  message: "La imagen debe pesar 4 MB o menos.",
};

function normalizeMimeType(value: string | null | undefined) {
  const normalized = value?.split(";")[0]?.trim().toLowerCase() || null;
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

function getPathExtension(value: string | null | undefined) {
  const normalized = value?.split("?")[0]?.split("#")[0]?.trim();
  if (!normalized) return null;

  const fileName = normalized.split("/").pop() ?? "";
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return null;
  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function getProfileImageExtension(
  file: ProfileImageFile
): ProfileImageExtension | null {
  const extension = getPathExtension(file.name) ?? getPathExtension(file.uri);
  return extension && extension in PROFILE_IMAGE_MIME_BY_EXTENSION
    ? (extension as ProfileImageExtension)
    : null;
}

export function detectProfileImageMimeType(
  bytes: Uint8Array
): ProfileImageMimeType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function validateProfileImage(
  file: ProfileImageFile,
  bytes: Uint8Array,
  fetchedMimeType?: string | null
): ProfileImageValidationResult {
  if (
    (typeof file.size === "number" && file.size > MAX_PROFILE_IMAGE_BYTES) ||
    bytes.byteLength > MAX_PROFILE_IMAGE_BYTES
  ) {
    return { ok: false, error: OVERSIZED_IMAGE_ERROR };
  }

  if (!file.uri.trim() || bytes.byteLength === 0) {
    return { ok: false, error: INVALID_IMAGE_ERROR };
  }

  const extension = getProfileImageExtension(file);
  const detectedMimeType = detectProfileImageMimeType(bytes);
  const declaredMimeType = normalizeMimeType(file.mime);
  const responseMimeType = normalizeMimeType(fetchedMimeType);
  const extensionMimeType = extension
    ? PROFILE_IMAGE_MIME_BY_EXTENSION[extension]
    : null;
  const responseDeclaresImage = responseMimeType?.startsWith("image/") === true;

  if (
    !extension ||
    !detectedMimeType ||
    !extensionMimeType ||
    extensionMimeType !== detectedMimeType ||
    (declaredMimeType != null && declaredMimeType !== detectedMimeType) ||
    (responseDeclaresImage && responseMimeType !== detectedMimeType)
  ) {
    return { ok: false, error: INVALID_IMAGE_ERROR };
  }

  return {
    ok: true,
    data: {
      extension,
      contentType: detectedMimeType,
    },
  };
}

export function createProfileImageObjectPath(
  kind: ProfileImageKind,
  entityId: string,
  extension: ProfileImageExtension,
  objectId: string
) {
  const prefix = kind === "buyer_profile" ? "buyers" : "businesses";
  return `${prefix}/${entityId}/${objectId}.${extension}`;
}

export function createProfileImageStagingPath(
  profileId: string,
  kind: ProfileImageKind,
  entityId: string,
  extension: ProfileImageExtension,
  objectId: string
) {
  return `pending/${profileId}/${kind}/${entityId}/${objectId}.${extension}`;
}

export function isExpectedProfileImageStagingPath(
  path: string,
  profileId: string,
  kind: ProfileImageKind,
  entityId: string
) {
  const escapedProfileId = profileId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEntityId = entityId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^pending/${escapedProfileId}/${kind}/${escapedEntityId}/${UUID_PATTERN}\\.(?:jpg|jpeg|png|webp)$`,
    "i"
  ).test(path);
}

export function isExpectedProfileImageObjectPath(
  path: string,
  kind: ProfileImageKind,
  entityId: string
) {
  const prefix = kind === "buyer_profile" ? "buyers" : "businesses";
  const escapedEntityId = entityId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${prefix}/${escapedEntityId}/${UUID_PATTERN}\\.(?:jpg|jpeg|png|webp)$`,
    "i"
  ).test(path);
}

export function isProfileImageObjectPath(path: string) {
  return new RegExp(
    `^(?:buyers|businesses)/${UUID_PATTERN}/${UUID_PATTERN}\\.(?:jpg|jpeg|png|webp)$`,
    "i"
  ).test(path);
}

export function createProfileImageStorageReference(
  bucket: string,
  objectPath: string
) {
  const normalizedBucket = bucket.trim();
  if (
    !normalizedBucket ||
    normalizedBucket.includes("/") ||
    !isProfileImageObjectPath(objectPath)
  ) {
    return null;
  }

  return `storage://${normalizedBucket}/${objectPath}`;
}

export function parseProfileImageStorageReference(
  reference: string,
  expectedBucket: string
) {
  const prefix = `storage://${expectedBucket}/`;
  if (!reference.startsWith(prefix)) return null;

  const objectPath = reference.slice(prefix.length);
  return isProfileImageObjectPath(objectPath) ? objectPath : null;
}
