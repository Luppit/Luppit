import { RPC_FUNCTIONS } from "@/src/db/functions";
import { supabase } from "@/src/lib/supabase/client";
import {
  AppError,
  fromAppError,
  fromSupabaseError,
} from "@/src/lib/supabase/errors";
import type { ActiveProfile } from "./active.profile.service";
import type {
  AccountOnboarding,
  IdentityStatus,
} from "./identity-verification.helpers";

export type { AccountOnboarding, IdentityStatus } from "./identity-verification.helpers";

export type StartIdentityVerificationResult = {
  attemptId: string;
  sessionToken: string;
  identityStatus: IdentityStatus;
};

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

const identityStatuses = new Set<IdentityStatus>([
  "NOT_STARTED",
  "IN_PROGRESS",
  "ACTION_REQUIRED",
  "IN_REVIEW",
  "VERIFIED",
  "INELIGIBLE",
  "LEGACY_EXEMPT",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseIdentityStatus(value: unknown): IdentityStatus | null {
  return typeof value === "string" &&
      identityStatuses.has(value as IdentityStatus)
    ? (value as IdentityStatus)
    : null;
}

function parseAccountOnboarding(value: unknown): AccountOnboarding | null {
  if (!isRecord(value)) return null;
  const intendedRole = value.intended_role === "buyer" || value.intended_role === "seller"
    ? value.intended_role
    : null;
  const identityStatus = parseIdentityStatus(value.identity_status);
  const profileId = value.profile_id === null ? null : nullableString(value.profile_id);
  const canCancel = typeof value.can_cancel === "boolean"
    ? value.can_cancel
    : false;
  if (
    !identityStatus ||
    typeof value.requires_identity_verification !== "boolean" ||
    typeof value.can_start !== "boolean" ||
    typeof value.can_retry !== "boolean" ||
    (value.safe_message !== null && typeof value.safe_message !== "string") ||
    (value.profile_id !== null && !profileId)
  ) {
    return null;
  }
  return {
    intendedRole,
    identityStatus,
    requiresIdentityVerification: value.requires_identity_verification,
    canStart: value.can_start,
    canRetry: value.can_retry,
    canCancel,
    safeMessage: nullableString(value.safe_message),
    profileId,
  };
}

function invalidResponse(): ServiceResult<never> {
  return { ok: false, error: fromAppError("validation") };
}

async function invokeError(error: unknown): Promise<AppError> {
  if (isRecord(error) && isRecord(error.context)) {
    const context = error.context as { clone?: () => Response; json?: () => Promise<unknown> };
    try {
      const response = typeof context.clone === "function" ? context.clone() : context;
      if (typeof response.json === "function") {
        const payload = await response.json();
        if (isRecord(payload) && typeof payload.error_code === "string") {
          return fromSupabaseError({
            code: payload.error_code,
            message: payload.error_code,
          });
        }
      }
    } catch {
      // Fall through to the shared mapper.
    }
  }
  return fromSupabaseError(error);
}

export async function beginCurrentUserBuyerOnboarding(): Promise<
  ServiceResult<AccountOnboarding>
> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.BEGIN_CURRENT_USER_BUYER_ONBOARDING,
    { p_source: "APP" } as never,
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const onboarding = parseAccountOnboarding(result.data);
  return onboarding ? { ok: true, data: onboarding } : invalidResponse();
}

export async function beginCurrentUserSellerOnboarding(
  invitationId?: string | null,
): Promise<
  ServiceResult<AccountOnboarding>
> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.BEGIN_CURRENT_USER_SELLER_ONBOARDING,
    {
      p_source: "APP",
      p_invitation_id: invitationId ?? null,
    } as never,
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const onboarding = parseAccountOnboarding(result.data);
  return onboarding ? { ok: true, data: onboarding } : invalidResponse();
}

export async function getCurrentAccountOnboarding(): Promise<
  ServiceResult<AccountOnboarding>
> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.GET_CURRENT_ACCOUNT_ONBOARDING,
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const onboarding = parseAccountOnboarding(result.data);
  return onboarding ? { ok: true, data: onboarding } : invalidResponse();
}

export async function cancelCurrentIdentityOnboarding(): Promise<
  ServiceResult<AccountOnboarding>
> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.CANCEL_CURRENT_IDENTITY_ONBOARDING,
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  const onboarding = parseAccountOnboarding(result.data);
  return onboarding ? { ok: true, data: onboarding } : invalidResponse();
}

export async function startCurrentUserIdentityVerification(): Promise<
  ServiceResult<StartIdentityVerificationResult>
> {
  const result = await supabase.functions.invoke("start-didit-verification", {
    body: { consentAccepted: true },
  });
  if (result.error) return { ok: false, error: await invokeError(result.error) };
  if (!isRecord(result.data)) return invalidResponse();
  const attemptId = nullableString(result.data.attemptId);
  const sessionToken = nullableString(result.data.sessionToken);
  const identityStatus = parseIdentityStatus(result.data.identityStatus);
  if (!attemptId || !sessionToken || !identityStatus) return invalidResponse();
  return { ok: true, data: { attemptId, sessionToken, identityStatus } };
}

export async function createCurrentUserBuyerProfileFromVerifiedIdentity(): Promise<
  ServiceResult<ActiveProfile>
> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.CREATE_CURRENT_USER_BUYER_PROFILE_FROM_VERIFIED_IDENTITY,
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  if (!isRecord(result.data) || typeof result.data.id !== "string") {
    return invalidResponse();
  }
  return { ok: true, data: result.data as ActiveProfile };
}

export async function createCurrentUserSellerProfileFromVerifiedIdentity(
  invitationId?: string | null,
): Promise<ServiceResult<ActiveProfile>> {
  const result = await supabase.rpc(
    RPC_FUNCTIONS.CREATE_CURRENT_USER_SELLER_PROFILE_FROM_VERIFIED_IDENTITY,
    { p_invitation_id: invitationId ?? null } as never,
  );
  if (result.error) return { ok: false, error: fromSupabaseError(result.error) };
  if (!isRecord(result.data) || typeof result.data.id !== "string") {
    return invalidResponse();
  }
  return { ok: true, data: result.data as ActiveProfile };
}
