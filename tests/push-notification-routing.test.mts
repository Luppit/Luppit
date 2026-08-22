import assert from "node:assert/strict";
import test from "node:test";

import {
  createPushRegistrationDiagnostic,
  parsePushNotificationRoute,
  shouldSuppressForegroundPush,
} from "../src/services/push-notification.helpers.ts";

const profileId = "90000000-0000-4000-8000-000000000001";
const notificationId = "90000000-0000-4000-8000-000000000002";
const conversationId = "90000000-0000-4000-8000-000000000003";
const purchaseRequestId = "90000000-0000-4000-8000-000000000004";

test("push navigation accepts only allowlisted structured routes", () => {
  assert.deepEqual(
    parsePushNotificationRoute({
      kind: "conversation",
      profileId,
      notificationId,
      conversationId,
      pathname: "/malicious-route",
    }),
    {
      kind: "conversation",
      profileId,
      notificationId,
      conversationId,
      purchaseRequestId: null,
    },
  );
  assert.deepEqual(
    parsePushNotificationRoute({ kind: "purchaseRequest", purchaseRequestId }),
    {
      kind: "purchaseRequest",
      profileId: null,
      notificationId: null,
      conversationId: null,
      purchaseRequestId,
    },
  );
  assert.equal(
    parsePushNotificationRoute({
      kind: "conversation",
      conversationId: "not-a-uuid",
    }),
    null,
  );
  assert.equal(
    parsePushNotificationRoute({ kind: "external", url: "https://example.com" }),
    null,
  );
});

test("foreground banners are suppressed only for the open conversation", () => {
  const route = parsePushNotificationRoute({
    kind: "conversation",
    conversationId,
  });
  assert.equal(shouldSuppressForegroundPush(route, conversationId), true);
  assert.equal(
    shouldSuppressForegroundPush(
      route,
      "90000000-0000-4000-8000-000000000005",
    ),
    false,
  );
  assert.equal(shouldSuppressForegroundPush(null, conversationId), false);
});

test("push registration diagnostics expose only a sanitized error code", () => {
  assert.deepEqual(
    createPushRegistrationDiagnostic("native_token", {
      code: "E_NOTIFICATIONS_DEVICE_NOT_REGISTERED",
      message: "ExpoPushToken[sensitive]",
    }),
    {
      stage: "native_token",
      code: "e_notifications_device_not_registered",
    },
  );
  assert.deepEqual(
    createPushRegistrationDiagnostic("expo_token", {
      name: "Network Error",
      message: "ExpoPushToken[sensitive]",
    }),
    {
      stage: "expo_token",
      code: "network_error",
    },
  );
  assert.deepEqual(
    createPushRegistrationDiagnostic(
      "configuration",
      undefined,
      "missing_project_id",
    ),
    {
      stage: "configuration",
      code: "missing_project_id",
    },
  );
  assert.doesNotMatch(
    JSON.stringify(
      createPushRegistrationDiagnostic("expo_token", {
        message: "ExpoPushToken[sensitive]",
      }),
    ),
    /sensitive/i,
  );
});
