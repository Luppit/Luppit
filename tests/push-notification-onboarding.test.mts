import assert from "node:assert/strict";
import test from "node:test";

import {
  canRegisterForPush,
  mapPushPermissionState,
  shouldPresentPushPermissionPrompt,
  shouldUnregisterPushDevice,
} from "../src/services/push-notification.helpers.ts";

test("maps granular iOS notification authorization states", () => {
  assert.deepEqual(
    mapPushPermissionState({
      platform: "ios",
      granted: false,
      status: "undetermined",
      canAskAgain: true,
      iosStatus: "provisional",
    }),
    { status: "provisional", canAskAgain: true },
  );
  assert.deepEqual(
    mapPushPermissionState({
      platform: "ios",
      granted: false,
      status: "undetermined",
      canAskAgain: false,
      iosStatus: "ephemeral",
    }),
    { status: "ephemeral", canAskAgain: false },
  );
  assert.deepEqual(
    mapPushPermissionState({
      platform: "ios",
      granted: false,
      status: "denied",
      canAskAgain: false,
      iosStatus: "denied",
    }),
    { status: "blocked", canAskAgain: false },
  );
});

test("distinguishes askable denial from blocked access", () => {
  assert.deepEqual(
    mapPushPermissionState({
      platform: "android",
      granted: false,
      status: "denied",
      canAskAgain: true,
    }),
    { status: "denied", canAskAgain: true },
  );
  assert.deepEqual(
    mapPushPermissionState({
      platform: "android",
      granted: false,
      status: "denied",
      canAskAgain: false,
    }),
    { status: "blocked", canAskAgain: false },
  );
});

test("registers only for delivery-capable permission states", () => {
  assert.equal(canRegisterForPush("granted"), true);
  assert.equal(canRegisterForPush("provisional"), true);
  assert.equal(canRegisterForPush("ephemeral"), true);
  assert.equal(canRegisterForPush("undetermined"), false);
  assert.equal(canRegisterForPush("blocked"), false);
  assert.equal(shouldUnregisterPushDevice("denied"), true);
  assert.equal(shouldUnregisterPushDevice("blocked"), true);
  assert.equal(shouldUnregisterPushDevice("unavailable"), false);
});

test("shows the explanation only on an eligible, unobstructed surface", () => {
  const eligible = {
    permissionStatus: "undetermined" as const,
    isAuthenticated: true,
    hasActiveProfile: true,
    isAppActive: true,
    isEligibleSurface: true,
    hasShownPrompt: false,
    hasOpenPopup: false,
  };

  assert.equal(shouldPresentPushPermissionPrompt(eligible), true);
  assert.equal(
    shouldPresentPushPermissionPrompt({ ...eligible, isAuthenticated: false }),
    false,
  );
  assert.equal(
    shouldPresentPushPermissionPrompt({ ...eligible, hasActiveProfile: false }),
    false,
  );
  assert.equal(
    shouldPresentPushPermissionPrompt({ ...eligible, isEligibleSurface: false }),
    false,
  );
  assert.equal(
    shouldPresentPushPermissionPrompt({ ...eligible, hasShownPrompt: true }),
    false,
  );
  assert.equal(
    shouldPresentPushPermissionPrompt({ ...eligible, hasOpenPopup: true }),
    false,
  );
  assert.equal(
    shouldPresentPushPermissionPrompt({ ...eligible, permissionStatus: "denied" }),
    false,
  );
  assert.equal(
    shouldPresentPushPermissionPrompt({ ...eligible, permissionStatus: "granted" }),
    false,
  );
});
