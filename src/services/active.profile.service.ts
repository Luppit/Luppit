import { Row } from "@/src/db/types";
import { supabase } from "@/src/lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "@/src/lib/supabase/errors";
import { createKVStorage } from "@/src/store/factory";

export type ActiveProfileSetupStatus =
  | "missing_role"
  | "missing_business"
  | "ready";

export type ActiveProfile = Row<"profile"> & {
  is_default: boolean;
};

export type ActiveProfileSummary = {
  profile: ActiveProfile;
  setupStatus: ActiveProfileSetupStatus;
  role: "buyer" | "seller" | null;
  businessId: string | null;
  businessName: string | null;
  membershipRole: "owner" | "member" | null;
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

export type CurrentBusinessInvitation = {
  id: string;
  status: "pending" | "accepted" | "declined" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
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

function mapProfileSummary(value: unknown): ActiveProfileSummary | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.user_id !== "string") return null;
  if (typeof row.name !== "string" || typeof row.id_document !== "string") return null;

  const setupStatus =
    row.setup_status === "missing_role" ||
    row.setup_status === "missing_business" ||
    row.setup_status === "ready"
      ? row.setup_status
      : "missing_role";
  const role = row.role === "buyer" || row.role === "seller" ? row.role : null;
  const membershipRole =
    row.membership_role === "owner" || row.membership_role === "member"
      ? row.membership_role
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
    } as ActiveProfile,
    setupStatus,
    role,
    businessId: typeof row.business_id === "string" ? row.business_id : null,
    businessName: typeof row.business_name === "string" ? row.business_name : null,
    membershipRole,
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
  const result: any = await (supabase as any).rpc("get_current_user_profiles");
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
  const result: any = await (supabase as any).rpc("create_current_user_profile", {
    p_name: input.name.trim(),
    p_id_document: input.idDocument.trim(),
    p_role: input.role,
    p_business_name: input.businessName?.trim() || null,
    p_business_id_document: input.businessIdDocument?.trim() || null,
    p_invitation_id: input.invitationId ?? null,
  });

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
  const result: any = await (supabase as any).rpc(
    "complete_current_user_profile_setup",
    {
      p_profile_id: profileId,
      p_role: input.role,
      p_business_name: input.businessName?.trim() || null,
      p_business_id_document: input.businessIdDocument?.trim() || null,
      p_invitation_id: input.invitationId ?? null,
    }
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
  const result: any = await (supabase as any).rpc(
    "get_current_user_business_invitations"
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
  const result: any = await (supabase as any).rpc(
    "decline_current_user_business_invitation",
    { p_invitation_id: invitationId }
  );
  if (result.error) return { ok: false as const, error: fromSupabaseError(result.error) };
  return { ok: true as const };
}

export async function inviteCurrentUserToBusiness(
  ownerProfileId: string,
  phone: string
) {
  const result: any = await (supabase as any).rpc(
    "invite_current_user_to_business",
    {
      p_owner_profile_id: ownerProfileId,
      p_phone: phone.trim(),
    }
  );
  if (result.error) return { ok: false as const, error: fromSupabaseError(result.error) };
  return { ok: true as const, data: result.data as string };
}

export async function getCurrentBusinessInvitations(ownerProfileId: string): Promise<
  { ok: true; data: CurrentBusinessInvitation[] } | { ok: false; error: AppError }
> {
  const result: any = await (supabase as any).rpc(
    "get_current_business_invitations",
    { p_owner_profile_id: ownerProfileId }
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };

  const invitations = (Array.isArray(result.data) ? result.data : [])
    .map((value: unknown) => {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      const status = row.status;
      if (
        typeof row.id !== "string" ||
        (status !== "pending" &&
          status !== "accepted" &&
          status !== "declined" &&
          status !== "revoked" &&
          status !== "expired") ||
        typeof row.created_at !== "string" ||
        typeof row.expires_at !== "string"
      ) {
        return null;
      }

      return {
        id: row.id,
        status,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        respondedAt: typeof row.responded_at === "string" ? row.responded_at : null,
      } satisfies CurrentBusinessInvitation;
    })
    .filter(
      (
        invitation: CurrentBusinessInvitation | null
      ): invitation is CurrentBusinessInvitation => invitation !== null
    );

  return { ok: true, data: invitations };
}

export async function revokeCurrentBusinessInvitation(
  ownerProfileId: string,
  invitationId: string
) {
  const result: any = await (supabase as any).rpc(
    "revoke_current_user_business_invitation",
    {
      p_owner_profile_id: ownerProfileId,
      p_invitation_id: invitationId,
    }
  );
  if (result.error) return { ok: false as const, error: fromSupabaseError(result.error) };
  return { ok: true as const };
}
