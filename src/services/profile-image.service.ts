import { RPC_FUNCTIONS } from "../db/functions";
import { COL_BUSINESS, TB_BUSINESS } from "../db/tables";
import { supabase } from "../lib/supabase/client";
import {
  AppError,
  fromAppError,
  fromSupabaseError,
} from "../lib/supabase/errors";
import {
  STORAGE_BUCKETS,
} from "../lib/supabase/storage";
import {
  getCurrentProfileSummary,
  requestActiveProfileRefresh,
} from "./active.profile.service";
import {
  createProfileImageObjectPath,
  createProfileImageStorageReference,
  isExpectedProfileImageObjectPath,
  parseProfileImageStorageReference,
  validateProfileImage,
  type ProfileImageFile,
  type ProfileImageKind,
} from "./profile-image.helpers";

export type { ProfileImageFile } from "./profile-image.helpers";

export type ProfileImageTarget = {
  kind: ProfileImageKind;
  entityId: string;
  imagePath: string | null;
  imageUrl: string | null;
  canManage: boolean;
};

type ProfileImageResult =
  | { ok: true; data: ProfileImageTarget }
  | { ok: false; error: AppError };

type ResolvedProfileImageTarget = ProfileImageTarget & {
  activeProfileId: string;
};

type SetProfileImageResponse = {
  entityId: string;
  imagePath: string | null;
  previousImagePath: string | null;
};

const MANAGE_FORBIDDEN_ERROR: AppError = {
  type: "auth",
  code: "profile_image_manage_forbidden",
  message: "Solo el propietario del negocio puede cambiar esta foto.",
};

const RETRYABLE_REMOVE_ERROR: AppError = {
  type: "unknown",
  code: "profile_image_remove_retryable",
  message: "No pudimos eliminar la foto. Inténtalo de nuevo.",
};

const RETRYABLE_CLEAR_ERROR: AppError = {
  type: "unknown",
  code: "profile_image_clear_retryable",
  message:
    "La foto se eliminó, pero no pudimos actualizar el perfil. Inténtalo de nuevo.",
};

function createUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseSetProfileImageResponse(
  value: unknown,
  kind: ProfileImageKind
): SetProfileImageResponse | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const entityId = toNullableString(
    kind === "buyer_profile" ? row.profile_id : row.business_id
  );
  if (!entityId) return null;

  return {
    entityId,
    imagePath: toNullableString(row.image_path),
    previousImagePath: toNullableString(row.previous_image_path),
  };
}

async function resolveCurrentTarget(): Promise<
  | { ok: true; data: ResolvedProfileImageTarget }
  | { ok: false; error: AppError }
> {
  const summary = getCurrentProfileSummary();
  if (!summary) return { ok: false, error: fromAppError("not_found") };

  if (summary.role === "buyer") {
    const imagePath = summary.profileImagePath ?? summary.profile.image_path ?? null;
    return {
      ok: true,
      data: {
        kind: "buyer_profile",
        entityId: summary.profile.id,
        activeProfileId: summary.profile.id,
        imagePath,
        imageUrl: await resolveProfileImageUrl(imagePath),
        canManage: true,
      },
    };
  }

  if (summary.role === "seller" && summary.businessId) {
    const businessResult = await supabase
      .from(TB_BUSINESS)
      .select("*")
      .eq(COL_BUSINESS.id, summary.businessId)
      .maybeSingle();
    if (businessResult.error) {
      return {
        ok: false,
        error: fromSupabaseError(businessResult.error),
      };
    }
    if (!businessResult.data) {
      return { ok: false, error: fromAppError("not_found") };
    }

    const business = businessResult.data as typeof businessResult.data & {
      image_path?: string | null;
    };
    const imagePath = business.image_path ?? null;
    return {
      ok: true,
      data: {
        kind: "business",
        entityId: summary.businessId,
        activeProfileId: summary.profile.id,
        imagePath,
        imageUrl: await resolveProfileImageUrl(imagePath),
        canManage: summary.membershipRole === "owner",
      },
    };
  }

  return { ok: false, error: fromAppError("not_found") };
}

async function setProfileImageMetadata(
  target: ResolvedProfileImageTarget,
  imagePath: string | null
): Promise<
  | { ok: true; data: SetProfileImageResponse }
  | { ok: false; error: AppError }
> {
  let result;
  try {
    result =
      target.kind === "buyer_profile"
        ? await supabase.rpc(
            RPC_FUNCTIONS.SET_CURRENT_BUYER_PROFILE_IMAGE as never,
            {
              p_profile_id: target.activeProfileId,
              p_image_path: imagePath,
            } as never
          )
        : await supabase.rpc(
            RPC_FUNCTIONS.SET_CURRENT_BUSINESS_PROFILE_IMAGE as never,
            {
              p_owner_profile_id: target.activeProfileId,
              p_image_path: imagePath,
            } as never
          );
  } catch {
    return { ok: false, error: fromAppError("network") };
  }

  if (result.error) {
    return { ok: false, error: fromSupabaseError(result.error) };
  }

  const parsed = parseSetProfileImageResponse(result.data, target.kind);
  if (!parsed || parsed.entityId !== target.entityId) {
    return { ok: false, error: fromAppError("validation") };
  }

  return { ok: true, data: parsed };
}

function getOwnedObjectPath(
  imagePath: string,
  target: Pick<ResolvedProfileImageTarget, "kind" | "entityId">
) {
  const objectPath = parseProfileImageStorageReference(
    imagePath,
    STORAGE_BUCKETS.profileImages
  );
  if (
    !objectPath ||
    !isExpectedProfileImageObjectPath(objectPath, target.kind, target.entityId)
  ) {
    return null;
  }
  return objectPath;
}

async function removeStorageObject(path: string) {
  try {
    const result = await supabase.storage
      .from(STORAGE_BUCKETS.profileImages)
      .remove([path]);
    return !result.error;
  } catch {
    return false;
  }
}

async function refreshActiveProfile(profileId: string) {
  try {
    await requestActiveProfileRefresh(profileId);
  } catch {
    return;
  }
}

export async function resolveProfileImageUrl(
  imagePath: string | null | undefined
): Promise<string | null> {
  const normalized = imagePath?.trim();
  if (!normalized) return null;

  const objectPath = parseProfileImageStorageReference(
    normalized,
    STORAGE_BUCKETS.profileImages
  );
  if (!objectPath) return null;

  const result = supabase.storage
    .from(STORAGE_BUCKETS.profileImages)
    .getPublicUrl(objectPath);
  return toNullableString(result.data.publicUrl);
}

export async function getCurrentProfileImageTarget(): Promise<ProfileImageResult> {
  const result = await resolveCurrentTarget();
  if (!result.ok) return result;

  const { activeProfileId: _activeProfileId, ...target } = result.data;
  return { ok: true, data: target };
}

export async function saveCurrentProfileImage(
  file: ProfileImageFile
): Promise<ProfileImageResult> {
  const targetResult = await resolveCurrentTarget();
  if (!targetResult.ok) return targetResult;

  const target = targetResult.data;
  if (!target.canManage) return { ok: false, error: MANAGE_FORBIDDEN_ERROR };

  let response: Response;
  let body: ArrayBuffer;
  try {
    response = await fetch(file.uri);
    body = await response.arrayBuffer();
  } catch {
    return { ok: false, error: fromAppError("network") };
  }

  const validation = validateProfileImage(
    file,
    new Uint8Array(body),
    response.headers.get("content-type")
  );
  if (!validation.ok) return validation;

  const objectPath = createProfileImageObjectPath(
    target.kind,
    target.entityId,
    validation.data.extension,
    createUuid()
  );
  const imagePath = createProfileImageStorageReference(
    STORAGE_BUCKETS.profileImages,
    objectPath
  );
  if (!imagePath) return { ok: false, error: fromAppError("validation") };
  let uploadResult;
  try {
    uploadResult = await supabase.storage
      .from(STORAGE_BUCKETS.profileImages)
      .upload(objectPath, body, {
        contentType: validation.data.contentType,
        upsert: false,
      });
  } catch {
    return { ok: false, error: fromAppError("network") };
  }
  if (uploadResult.error) {
    return { ok: false, error: fromSupabaseError(uploadResult.error) };
  }

  const metadataResult = await setProfileImageMetadata(target, imagePath);
  if (!metadataResult.ok || metadataResult.data.imagePath !== imagePath) {
    await removeStorageObject(objectPath);
    return metadataResult.ok
      ? { ok: false, error: fromAppError("validation") }
      : metadataResult;
  }

  const previousImagePath =
    metadataResult.data.previousImagePath ?? target.imagePath;
  if (previousImagePath && previousImagePath !== imagePath) {
    const previousObjectPath = getOwnedObjectPath(previousImagePath, target);
    if (previousObjectPath) await removeStorageObject(previousObjectPath);
  }

  await refreshActiveProfile(target.activeProfileId);
  return {
    ok: true,
    data: {
      kind: target.kind,
      entityId: target.entityId,
      imagePath,
      imageUrl: await resolveProfileImageUrl(imagePath),
      canManage: true,
    },
  };
}

export async function removeCurrentProfileImage(): Promise<ProfileImageResult> {
  const targetResult = await resolveCurrentTarget();
  if (!targetResult.ok) return targetResult;

  const target = targetResult.data;
  if (!target.canManage) return { ok: false, error: MANAGE_FORBIDDEN_ERROR };

  if (target.imagePath) {
    const objectPath = getOwnedObjectPath(target.imagePath, target);
    if (!objectPath || !(await removeStorageObject(objectPath))) {
      return { ok: false, error: RETRYABLE_REMOVE_ERROR };
    }
  }

  const metadataResult = await setProfileImageMetadata(target, null);
  if (!metadataResult.ok || metadataResult.data.imagePath !== null) {
    return { ok: false, error: RETRYABLE_CLEAR_ERROR };
  }

  await refreshActiveProfile(target.activeProfileId);
  return {
    ok: true,
    data: {
      kind: target.kind,
      entityId: target.entityId,
      imagePath: null,
      imageUrl: null,
      canManage: true,
    },
  };
}
