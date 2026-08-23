export type IdentityStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ACTION_REQUIRED"
  | "IN_REVIEW"
  | "VERIFIED"
  | "INELIGIBLE"
  | "LEGACY_EXEMPT";

export type AccountOnboarding = {
  intendedRole: "buyer" | "seller" | null;
  identityStatus: IdentityStatus;
  requiresIdentityVerification: boolean;
  canStart: boolean;
  canRetry: boolean;
  canCancel: boolean;
  safeMessage: string | null;
  profileId: string | null;
};

export type BuyerProfileCreationMode =
  | "unavailable"
  | "verified"
  | "identity_required"
  | "legacy";

export function getBuyerProfileCreationMode(
  hasBuyerProfile: boolean,
  identityStatus: IdentityStatus,
): BuyerProfileCreationMode {
  if (hasBuyerProfile) return "unavailable";
  if (identityStatus === "VERIFIED") return "verified";
  if (identityStatus === "LEGACY_EXEMPT") return "legacy";
  return "identity_required";
}

export function getNoProfileAccountState(
  onboarding: AccountOnboarding,
): "identity_required" | "no_profile" {
  return onboarding.requiresIdentityVerification
    ? "identity_required"
    : "no_profile";
}
