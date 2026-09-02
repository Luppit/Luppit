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

export type SignupPostVerificationAction =
  | "use_existing_account"
  | "resume_onboarding"
  | "start_onboarding";

export async function continueIdentityVerificationAfterOnboarding(
  dependencies: {
    refreshProfiles: () => Promise<boolean>;
    navigate: () => void;
  },
): Promise<boolean> {
  const refreshed = await dependencies.refreshProfiles();
  if (!refreshed) return false;

  dependencies.navigate();
  return true;
}

export function getSignupPostVerificationAction(
  profileCount: number,
  onboarding: AccountOnboarding,
): SignupPostVerificationAction {
  if (profileCount > 0) return "use_existing_account";
  if (
    onboarding.intendedRole !== null ||
    onboarding.profileId !== null ||
    onboarding.requiresIdentityVerification ||
    onboarding.identityStatus !== "NOT_STARTED"
  ) {
    return "resume_onboarding";
  }
  return "start_onboarding";
}

export async function continueSignupAfterVerification(
  intendedRole: "buyer" | "seller",
  dependencies: {
    getProfileCount: () => Promise<number>;
    getOnboarding: () => Promise<AccountOnboarding>;
    beginOnboarding: (role: "buyer" | "seller") => Promise<void>;
  },
): Promise<SignupPostVerificationAction> {
  const profileCount = await dependencies.getProfileCount();
  if (profileCount > 0) return "use_existing_account";

  const onboarding = await dependencies.getOnboarding();
  const action = getSignupPostVerificationAction(profileCount, onboarding);
  if (action === "start_onboarding") {
    await dependencies.beginOnboarding(intendedRole);
  }
  return action;
}

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
