import { RPC_FUNCTIONS } from "@/src/db/functions";
import { Row } from "@/src/db/types";
import { supabase } from "@/src/lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "@/src/lib/supabase/errors";
import { STORAGE_BUCKETS } from "@/src/lib/supabase/storage";
import { createKVStorage } from "@/src/store/factory";
import {
  COSTA_RICA_LEGAL_ID_ERROR,
  COSTA_RICA_PERSONAL_ID_ERROR,
  isValidCostaRicaLegalId,
  isValidCostaRicaPersonalId,
} from "@/src/utils/costaRicaIdDocument";
import { parseProfileImageStorageReference } from "./profile-image.helpers";
import type { IdentityStatus } from "./identity-verification.service";

export type ActiveProfileSetupStatus =
  | "missing_role"
  | "missing_business"
  | "business_verification_required"
  | "ready";

export type BusinessVerificationStatus =
  | "PENDING"
  | "NEEDS_ACTION"
  | "APPROVED"
  | "REJECTED";

export type ActiveProfile = Row<"profile"> & {
  is_default: boolean;
};

export type ActiveProfileSummary = {
  profile: ActiveProfile;
  setupStatus: ActiveProfileSetupStatus;
  role: "buyer" | "seller" | null;
  businessId: string | null;
  businessName: string | null;
  businessImagePath: string | null;
  businessImageUrl: string | null;
  membershipRole: "owner" | "member" | null;
  profileImagePath: string | null;
  profileImageUrl: string | null;
  identityStatus: IdentityStatus;
  businessVerificationStatus: BusinessVerificationStatus | null;
  businessVerificationSafeMessage: string | null;
  unreadCount: number;
};

export type CreateCurrentUserProfileInput = {
  name: string;
  idDocument: string;
  role: "buyer" | "seller";
  businessName?: string | null;
  businessIdDocument?: string | null;
  invitationId?: string | null;
};

export type CurrentUserBusinessInvitation = {
  id: string;
  businessId: string;
  businessName: string;
  inviterProfileName: string;
  createdAt: string;
  expiresAt: string;
};

export type CurrentBusinessMember = {
  membershipId: string;
  profileId: string;
  name: string;
  membershipRole: "owner" | "member";
  joinedAt: string;
  canRemove: boolean;
  removeBlockReason:
    | "business_owner_cannot_be_removed"
    | "business_member_has_conversation_history"
    | null;
};

export type CurrentBusinessPendingInvitation = {
  id: string;
  recipientLabel: string;
  createdAt: string;
  expiresAt: string;
};

export type CurrentBusinessTeam = {
  businessId: string;
  businessName: string;
  members: CurrentBusinessMember[];
  pendingInvitations: CurrentBusinessPendingInvitation[];
};

type ActiveProfileListener = () => void;
type ActiveProfileRefreshListener = (
  preferredProfileId?: string | null
) => boolean | Promise<boolean>;

const storage = createKVStorage();
const listeners = new Set<ActiveProfileListener>();
const refreshListeners = new Set<ActiveProfileRefreshListener>();
const profileScopedAbortControllers = new Set<AbortController>();
const environmentKey = (
  process.env.EXPO_PUBLIC_ENV ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "dev"
).replace(/[^a-zA-Z0-9_-]/g, "_");

let currentProfileSummary: ActiveProfileSummary | null = null;
let currentUserProfileCount = 0;
let initialProfileBootstrapPending = false;

function activeProfileStorageKey(userId: string) {
  return "active_profile_id:" + environmentKey + ":" + userId;
}

function parseCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveProfileImageSource(value: unknown) {
  const imagePath =
    typeof value === "string" && value.trim() ? value.trim() : null;
  const imageObjectPath = imagePath
    ? parseProfileImageStorageReference(
        imagePath,
        STORAGE_BUCKETS.profileImages
      )
    : null;
  const imageUrl = imageObjectPath
    ? supabase.storage
        .from(STORAGE_BUCKETS.profileImages)
        .getPublicUrl(imageObjectPath).data.publicUrl || null
    : null;

  return { imagePath, imageUrl };
}

function mapProfileSummary(value: unknown): ActiveProfileSummary | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.user_id !== "string") return null;
  if (
    typeof row.name !== "string" ||
    (row.id_document !== null && typeof row.id_document !== "string")
  ) return null;

  const setupStatus =
    row.setup_status === "missing_role" ||
    row.setup_status === "missing_business" ||
    row.setup_status === "business_verification_required" ||
    row.setup_status === "ready"
      ? row.setup_status
      : "missing_role";
  const role = row.role === "buyer" || row.role === "seller" ? row.role : null;
  const membershipRole =
    row.membership_role === "owner" || row.membership_role === "member"
      ? row.membership_role
      : null;
  const profileImage = resolveProfileImageSource(row.profile_image_path);
  const businessImage = resolveProfileImageSource(row.business_image_path);
  const identityStatus =
    row.identity_status === "NOT_STARTED" ||
    row.identity_status === "IN_PROGRESS" ||
    row.identity_status === "ACTION_REQUIRED" ||
    row.identity_status === "IN_REVIEW" ||
    row.identity_status === "VERIFIED" ||
    row.identity_status === "INELIGIBLE" ||
    row.identity_status === "LEGACY_EXEMPT"
      ? row.identity_status
      : "LEGACY_EXEMPT";
  const businessVerificationStatus =
    row.business_verification_status === "PENDING" ||
    row.business_verification_status === "NEEDS_ACTION" ||
    row.business_verification_status === "APPROVED" ||
    row.business_verification_status === "REJECTED"
      ? row.business_verification_status
      : null;

  return {
    profile: {
      id: row.id,
      created_at: typeof row.created_at === "string" ? row.created_at : "",
      user_id: row.user_id,
      name: row.name,
      id_document: row.id_document,
      phone: typeof row.phone === "string" ? row.phone : null,
      email: typeof row.email === "string" ? row.email : null,
      email_opt_in: row.email_opt_in === true,
      email_opt_in_at:
        typeof row.email_opt_in_at === "string" ? row.email_opt_in_at : null,
      is_default: row.is_default === true,
      image_path: profileImage.imagePath,
    } as ActiveProfile,
    setupStatus,
    role,
    businessId: typeof row.business_id === "string" ? row.business_id : null,
    businessName: typeof row.business_name === "string" ? row.business_name : null,
    businessImagePath: businessImage.imagePath,
    businessImageUrl: businessImage.imageUrl,
    membershipRole,
    profileImagePath: profileImage.imagePath,
    profileImageUrl: profileImage.imageUrl,
    identityStatus,
    businessVerificationStatus,
    businessVerificationSafeMessage:
      typeof row.business_verification_safe_message === "string"
        ? row.business_verification_safe_message
        : null,
    unreadCount: parseCount(row.unread_count),
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeActiveProfile(listener: ActiveProfileListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeActiveProfileRefresh(
  listener: ActiveProfileRefreshListener
) {
  refreshListeners.add(listener);
  return () => refreshListeners.delete(listener);
}

export async function requestActiveProfileRefresh(
  preferredProfileId?: string | null
) {
  const results = await Promise.all(
    Array.from(refreshListeners, (listener) => listener(preferredProfileId))
  );
  return results.some(Boolean);
}

export function setCurrentProfileSummary(summary: ActiveProfileSummary | null) {
  currentProfileSummary = summary;
  emit();
}

export function setCurrentUserProfileCount(count: number) {
  currentUserProfileCount = Math.max(0, Math.trunc(count));
}

export function getCurrentProfileSummary() {
  return currentProfileSummary;
}

export function getCurrentUserProfileCount() {
  return currentUserProfileCount;
}

export function setInitialProfileBootstrapPending(pending: boolean) {
  initialProfileBootstrapPending = pending;
}

export function isInitialProfileBootstrapPending() {
  return initialProfileBootstrapPending;
}

export function getCurrentProfile() {
  return currentProfileSummary?.profile ?? null;
}

export async function getCurrentProfileResult(): Promise<
  | { ok: true; data: ActiveProfile }
  | { ok: false; error: AppError }
  | null
> {
  const profile = getCurrentProfile();
  return profile ? { ok: true, data: profile } : null;
}

export async function listCurrentUserProfiles(): Promise<
  { ok: true; data: ActiveProfileSummary[] } | { ok: false; error: AppError }
> {
  const result = await supabase.rpc(RPC_FUNCTIONS.GET_CURRENT_USER_PROFILES);
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };

  const profiles = (Array.isArray(result.data) ? result.data : [])
    .map((value: unknown) => mapProfileSummary(value))
    .filter(
      (
        profile: ActiveProfileSummary | null
      ): profile is ActiveProfileSummary => profile !== null
    );

  return { ok: true, data: profiles };
}

export async function getStoredActiveProfileId(userId: string) {
  return await storage.getItem(activeProfileStorageKey(userId));
}

export async function persistActiveProfileId(userId: string, profileId: string) {
  await storage.setItem(activeProfileStorageKey(userId), profileId);
}

export async function clearLegacySavedProfiles() {
  await storage.removeItem("saved_profiles");
}

export function registerProfileScopedAbortController(controller: AbortController) {
  profileScopedAbortControllers.add(controller);
  return () => profileScopedAbortControllers.delete(controller);
}

export function abortProfileScopedRequests() {
  profileScopedAbortControllers.forEach((controller) => controller.abort());
  profileScopedAbortControllers.clear();
}

export async function createCurrentUserProfile(
  input: CreateCurrentUserProfileInput
): Promise<{ ok: true; data: ActiveProfile } | { ok: false; error: AppError }> {
  if (!isValidCostaRicaPersonalId(input.idDocument)) {
    return {
      ok: false,
      error: { type: "validation", message: COSTA_RICA_PERSONAL_ID_ERROR },
    };
  }
  if (
    input.role === "seller" &&
    !input.invitationId &&
    !isValidCostaRicaLegalId(input.businessIdDocument ?? "")
  ) {
    return {
      ok: false,
      error: { type: "validation", message: COSTA_RICA_LEGAL_ID_ERROR },
    };
  }

  const result = await supabase.rpc(
    RPC_FUNCTIONS.CREATE_CURRENT_USER_PROFILE,
    {
      p_name: input.name.trim(),
      p_id_document: input.idDocument.trim(),
      p_role: input.role,
      p_business_name: input.businessName?.trim() || null,
      p_business_id_document: input.businessIdDocument?.trim() || null,
      p_invitation_id: input.invitationId ?? null,
    } as never
  );

  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  if (!result.data || typeof result.data.id !== "string") {
    return { ok: false, error: fromAppError("validation") };
  }

  return { ok: true, data: result.data as ActiveProfile };
}

export async function completeCurrentUserProfileSetup(
  profileId: string,
  input: Omit<CreateCurrentUserProfileInput, "name" | "idDocument">
): Promise<{ ok: true; data: ActiveProfile } | { ok: false; error: AppError }> {
  if (
    input.role === "seller" &&
    !input.invitationId &&
    !isValidCostaRicaLegalId(input.businessIdDocument ?? "")
  ) {
    return {
      ok: false,
      error: { type: "validation", message: COSTA_RICA_LEGAL_ID_ERROR },
    };
  }

  const result = await supabase.rpc(
    RPC_FUNCTIONS.COMPLETE_CURRENT_USER_PROFILE_SETUP,
    {
      p_profile_id: profileId,
      p_role: input.role,
      p_business_name: input.businessName?.trim() || null,
      p_business_id_document: input.businessIdDocument?.trim() || null,
      p_invitation_id: input.invitationId ?? null,
    } as never
  );

  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  if (!result.data || typeof result.data.id !== "string") {
    return { ok: false, error: fromAppError("validation") };
  }

  return { ok: true, data: result.data as ActiveProfile };
}

export async function getCurrentUserBusinessInvitations(): Promise<
  | { ok: true; data: CurrentUserBusinessInvitation[] }
  | { ok: false; error: AppError }
> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_CURRENT_USER_BUSINESS_INVITATIONS
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };

  const invitations = (Array.isArray(result.data) ? result.data : [])
    .map((value: unknown) => {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      if (
        typeof row.id !== "string" ||
        typeof row.business_id !== "string" ||
        typeof row.business_name !== "string" ||
        typeof row.created_at !== "string" ||
        typeof row.expires_at !== "string"
      ) {
        return null;
      }

      return {
        id: row.id,
        businessId: row.business_id,
        businessName: row.business_name,
        inviterProfileName:
          typeof row.inviter_profile_name === "string"
            ? row.inviter_profile_name
            : "",
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      } satisfies CurrentUserBusinessInvitation;
    })
    .filter(
      (
        invitation: CurrentUserBusinessInvitation | null
      ): invitation is CurrentUserBusinessInvitation => invitation !== null
    );

  return { ok: true, data: invitations };
}

export async function declineCurrentUserBusinessInvitation(invitationId: string) {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.DECLINE_CURRENT_USER_BUSINESS_INVITATION,
    { p_invitation_id: invitationId }
  );
  if (result.error) return { ok: false as const, error: fromSupabaseError(result.error) };
  return { ok: true as const };
}

async function getCurrentProfileId() {
  const profile = await getCurrentProfileResult();
  if (!profile) return { ok: false as const, error: fromAppError("auth") };
  if (!profile.ok) return profile;
  return { ok: true as const, data: profile.data.id };
}

export async function inviteCurrentUserToBusiness(phone: string) {
  const profile = await getCurrentProfileId();
  if (!profile.ok) return profile;

  const result = await supabase.rpc(
    RPC_FUNCTIONS.INVITE_CURRENT_USER_TO_BUSINESS,
    {
      p_owner_profile_id: profile.data,
      p_phone: phone.trim(),
    }
  );
  if (result.error) return { ok: false as const, error: fromSupabaseError(result.error) };
  return { ok: true as const, data: result.data as string };
}

export async function getCurrentBusinessTeam(): Promise<
  { ok: true; data: CurrentBusinessTeam } | { ok: false; error: AppError }
> {
  const profile = await getCurrentProfileId();
  if (!profile.ok) return profile;

  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_CURRENT_BUSINESS_TEAM,
    { p_owner_profile_id: profile.data }
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };

  if (!result.data || typeof result.data !== "object") {
    return { ok: false, error: fromAppError("validation") };
  }

  const payload = result.data as Record<string, unknown>;
  if (
    typeof payload.business_id !== "string" ||
    typeof payload.business_name !== "string"
  ) {
    return { ok: false, error: fromAppError("validation") };
  }

  const members = (Array.isArray(payload.members) ? payload.members : [])
    .map((value: unknown) => {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      if (
        typeof row.membership_id !== "string" ||
        typeof row.profile_id !== "string" ||
        typeof row.name !== "string" ||
        (row.membership_role !== "owner" && row.membership_role !== "member") ||
        typeof row.joined_at !== "string" ||
        typeof row.can_remove !== "boolean"
      ) {
        return null;
      }

      return {
        membershipId: row.membership_id,
        profileId: row.profile_id,
        name: row.name,
        membershipRole: row.membership_role,
        joinedAt: row.joined_at,
        canRemove: row.can_remove,
        removeBlockReason:
          row.remove_block_reason === "business_owner_cannot_be_removed" ||
          row.remove_block_reason === "business_member_has_conversation_history"
            ? row.remove_block_reason
            : null,
      } satisfies CurrentBusinessMember;
    })
    .filter(
      (member: CurrentBusinessMember | null): member is CurrentBusinessMember =>
        member !== null
    );

  const pendingInvitations = (
    Array.isArray(payload.pending_invitations) ? payload.pending_invitations : []
  )
    .map((value: unknown) => {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      if (
        typeof row.id !== "string" ||
        typeof row.recipient_label !== "string" ||
        typeof row.created_at !== "string" ||
        typeof row.expires_at !== "string"
      ) {
        return null;
      }

      return {
        id: row.id,
        recipientLabel: row.recipient_label,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      } satisfies CurrentBusinessPendingInvitation;
    })
    .filter(
      (
        invitation: CurrentBusinessPendingInvitation | null
      ): invitation is CurrentBusinessPendingInvitation => invitation !== null
    );

  return {
    ok: true,
    data: {
      businessId: payload.business_id,
      businessName: payload.business_name,
      members,
      pendingInvitations,
    },
  };
}

export async function revokeCurrentBusinessInvitation(invitationId: string) {
  const profile = await getCurrentProfileId();
  if (!profile.ok) return profile;

  const result = await supabase.rpc(
    RPC_FUNCTIONS.REVOKE_CURRENT_USER_BUSINESS_INVITATION,
    {
      p_owner_profile_id: profile.data,
      p_invitation_id: invitationId,
    }
  );
  if (result.error) return { ok: false as const, error: fromSupabaseError(result.error) };
  return { ok: true as const };
}

export async function removeCurrentBusinessMember(membershipId: string) {
  const profile = await getCurrentProfileId();
  if (!profile.ok) return profile;

  const result = await supabase.rpc(
    RPC_FUNCTIONS.REMOVE_CURRENT_BUSINESS_MEMBER,
    {
      p_owner_profile_id: profile.data,
      p_membership_id: membershipId,
    }
  );
  if (result.error) return { ok: false as const, error: fromSupabaseError(result.error) };
  return { ok: true as const, data: result.data as Record<string, unknown> };
}
