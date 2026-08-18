import assert from "node:assert/strict";
import test from "node:test";

import {
  getBuyerProfileCreationMode,
  getNoProfileAccountState,
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
