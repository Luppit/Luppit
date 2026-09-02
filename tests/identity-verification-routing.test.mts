import assert from "node:assert/strict";
import test from "node:test";

import {
  continueSignupAfterVerification,
  getBuyerProfileCreationMode,
  getNoProfileAccountState,
  getSignupPostVerificationAction,
} from "../src/services/identity-verification.helpers.ts";
import type {
  AccountOnboarding,
  IdentityStatus,
} from "../src/services/identity-verification.helpers.ts";

function onboarding(
  identityStatus: IdentityStatus,
  requiresIdentityVerification: boolean,
): AccountOnboarding {
  return {
    intendedRole: "buyer",
    identityStatus,
    requiresIdentityVerification,
    canStart: false,
    canRetry: false,
    canCancel: false,
    safeMessage: null,
    profileId: null,
  };
}

test("every unfinished required identity state resumes the Didit route", () => {
  for (
    const status of [
      "NOT_STARTED",
      "IN_PROGRESS",
      "ACTION_REQUIRED",
      "IN_REVIEW",
      "INELIGIBLE",
    ] as const
  ) {
    assert.equal(
      getNoProfileAccountState(onboarding(status, true)),
      "identity_required",
      status,
    );
  }
});

test("legacy-exempt accounts retain the existing profile-creation route", () => {
  assert.equal(
    getNoProfileAccountState(onboarding("LEGACY_EXEMPT", false)),
    "no_profile",
  );
});

test("verified accounts do not restart Didit if profile refresh is briefly delayed", () => {
  assert.equal(
    getNoProfileAccountState(onboarding("VERIFIED", false)),
    "no_profile",
  );
});

test("an existing buyer makes additional buyer creation unavailable", () => {
  assert.equal(
    getBuyerProfileCreationMode(true, "VERIFIED"),
    "unavailable",
  );
});

test("seller-only accounts use the correct buyer activation path", () => {
  assert.equal(
    getBuyerProfileCreationMode(false, "VERIFIED"),
    "verified",
  );
  assert.equal(
    getBuyerProfileCreationMode(false, "NOT_STARTED"),
    "identity_required",
  );
  assert.equal(
    getBuyerProfileCreationMode(false, "IN_REVIEW"),
    "identity_required",
  );
  assert.equal(
    getBuyerProfileCreationMode(false, "LEGACY_EXEMPT"),
    "legacy",
  );
});

test("signup uses an existing account without restarting onboarding", () => {
  assert.equal(
    getSignupPostVerificationAction(1, onboarding("NOT_STARTED", false)),
    "use_existing_account",
  );
});

test("signup resumes authoritative onboarding progress", () => {
  for (
    const status of [
      "NOT_STARTED",
      "IN_PROGRESS",
      "ACTION_REQUIRED",
      "IN_REVIEW",
      "VERIFIED",
      "INELIGIBLE",
      "LEGACY_EXEMPT",
    ] as const
  ) {
    for (const role of ["buyer", "seller"] as const) {
      const existing = onboarding(status, status !== "VERIFIED");
      existing.intendedRole = role;
      assert.equal(
        getSignupPostVerificationAction(0, existing),
        "resume_onboarding",
        `${role}:${status}`,
      );
    }
  }
});

test("signup starts onboarding only for a pristine account", () => {
  const pristine = onboarding("NOT_STARTED", false);
  pristine.intendedRole = null;

  assert.equal(
    getSignupPostVerificationAction(0, pristine),
    "start_onboarding",
  );
});

test("signup fails closed for a legacy account without stored intent", () => {
  const legacy = onboarding("LEGACY_EXEMPT", false);
  legacy.intendedRole = null;

  assert.equal(
    getSignupPostVerificationAction(0, legacy),
    "resume_onboarding",
  );
});

test("existing signup accounts never read or restart onboarding", async () => {
  let onboardingReads = 0;
  let onboardingStarts = 0;

  const action = await continueSignupAfterVerification("seller", {
    getProfileCount: async () => 2,
    getOnboarding: async () => {
      onboardingReads += 1;
      return onboarding("NOT_STARTED", false);
    },
    beginOnboarding: async () => {
      onboardingStarts += 1;
    },
  });

  assert.equal(action, "use_existing_account");
  assert.equal(onboardingReads, 0);
  assert.equal(onboardingStarts, 0);
});

test("stored onboarding wins over the newly selected signup role", async () => {
  const existing = onboarding("IN_PROGRESS", true);
  existing.intendedRole = "buyer";
  let onboardingStarts = 0;

  const action = await continueSignupAfterVerification("seller", {
    getProfileCount: async () => 0,
    getOnboarding: async () => existing,
    beginOnboarding: async () => {
      onboardingStarts += 1;
    },
  });

  assert.equal(action, "resume_onboarding");
  assert.equal(onboardingStarts, 0);
});

test("pristine signup starts only the selected onboarding role", async () => {
  const pristine = onboarding("NOT_STARTED", false);
  pristine.intendedRole = null;
  const startedRoles: string[] = [];

  const action = await continueSignupAfterVerification("seller", {
    getProfileCount: async () => 0,
    getOnboarding: async () => pristine,
    beginOnboarding: async (role) => {
      startedRoles.push(role);
    },
  });

  assert.equal(action, "start_onboarding");
  assert.deepEqual(startedRoles, ["seller"]);
});

test("signup fails closed when authoritative onboarding cannot be read", async () => {
  let onboardingStarts = 0;

  await assert.rejects(
    continueSignupAfterVerification("buyer", {
      getProfileCount: async () => 0,
      getOnboarding: async () => {
        throw new Error("unavailable");
      },
      beginOnboarding: async () => {
        onboardingStarts += 1;
      },
    }),
    /unavailable/,
  );
  assert.equal(onboardingStarts, 0);
});
