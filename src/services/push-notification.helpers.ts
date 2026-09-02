export type PushNotificationRoute = {
  kind:
    | "conversation"
    | "purchaseRequest"
    | "notifications"
    | "identityVerification"
    | "businessVerification";
  profileId: string | null;
  notificationId: string | null;
  conversationId: string | null;
  purchaseRequestId: string | null;
};

export type PushRegistrationStage =
  | "platform"
  | "permission"
  | "configuration"
  | "native_token"
  | "expo_token"
  | "supabase";

export type PushRegistrationDiagnostic = {
  stage: PushRegistrationStage;
  code: string;
};

export type PushPermissionStatus =
  | "granted"
  | "provisional"
  | "ephemeral"
  | "denied"
  | "blocked"
  | "undetermined"
  | "unavailable";

export type PushPermissionState = {
  status: PushPermissionStatus;
  canAskAgain: boolean;
};

export type NativePushPermissionInput = {
  platform: "android" | "ios";
  granted: boolean;
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
  iosStatus?:
    | "authorized"
    | "provisional"
    | "ephemeral"
    | "denied"
    | "not_determined"
    | null;
};

export type PushPromptEligibilityInput = {
  permissionStatus: PushPermissionStatus;
  isAuthenticated: boolean;
  hasActiveProfile: boolean;
  isAppActive: boolean;
  isEligibleSurface: boolean;
  hasShownPrompt: boolean;
  hasOpenPopup: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeDiagnosticCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .slice(0, 80);
  return normalized || null;
}

export function createPushRegistrationDiagnostic(
  stage: PushRegistrationStage,
  error?: unknown,
  fallbackCode = "unknown",
): PushRegistrationDiagnostic {
  const value = isRecord(error) ? error : null;
  return {
    stage,
    code: normalizeDiagnosticCode(value?.code) ??
      normalizeDiagnosticCode(value?.name) ??
      normalizeDiagnosticCode(fallbackCode) ??
      "unknown",
  };
}

export function mapPushPermissionState(
  input: NativePushPermissionInput,
): PushPermissionState {
  if (input.platform === "ios") {
    if (input.iosStatus === "authorized") {
      return { status: "granted", canAskAgain: input.canAskAgain };
    }
    if (input.iosStatus === "provisional") {
      return { status: "provisional", canAskAgain: input.canAskAgain };
    }
    if (input.iosStatus === "ephemeral") {
      return { status: "ephemeral", canAskAgain: input.canAskAgain };
    }
    if (input.iosStatus === "denied") {
      return {
        status: input.canAskAgain ? "denied" : "blocked",
        canAskAgain: input.canAskAgain,
      };
    }
    if (input.iosStatus === "not_determined") {
      return { status: "undetermined", canAskAgain: input.canAskAgain };
    }
  }

  if (input.granted || input.status === "granted") {
    return { status: "granted", canAskAgain: input.canAskAgain };
  }
  if (input.status === "denied") {
    return {
      status: input.canAskAgain ? "denied" : "blocked",
      canAskAgain: input.canAskAgain,
    };
  }
  return { status: "undetermined", canAskAgain: input.canAskAgain };
}

export function canRegisterForPush(status: PushPermissionStatus) {
  return status === "granted" || status === "provisional" || status === "ephemeral";
}

export function shouldUnregisterPushDevice(status: PushPermissionStatus) {
  return status === "denied" || status === "blocked";
}

export function shouldPresentPushPermissionPrompt(
  input: PushPromptEligibilityInput,
) {
  return (
    input.permissionStatus === "undetermined" &&
    input.isAuthenticated &&
    input.hasActiveProfile &&
    input.isAppActive &&
    input.isEligibleSurface &&
    !input.hasShownPrompt &&
    !input.hasOpenPopup
  );
}

function getUuid(value: unknown) {
  return typeof value === "string" && uuidPattern.test(value.trim())
    ? value.trim()
    : null;
}

export function parsePushNotificationRoute(
  value: unknown,
): PushNotificationRoute | null {
  if (!isRecord(value)) return null;

  const profileId = getUuid(value.profileId);
  const notificationId = getUuid(value.notificationId);
  const conversationId = getUuid(value.conversationId);
  const purchaseRequestId = getUuid(value.purchaseRequestId);
  const kind = value.kind;

  if (kind === "conversation" && conversationId) {
    return {
      kind,
      profileId,
      notificationId,
      conversationId,
      purchaseRequestId: null,
    };
  }
  if (kind === "purchaseRequest" && purchaseRequestId) {
    return {
      kind,
      profileId,
      notificationId,
      conversationId: null,
      purchaseRequestId,
    };
  }
  if (
    kind === "notifications" ||
    kind === "identityVerification" ||
    kind === "businessVerification"
  ) {
    return {
      kind,
      profileId,
      notificationId,
      conversationId: null,
      purchaseRequestId: null,
    };
  }

  return null;
}

export function shouldSuppressForegroundPush(
  route: PushNotificationRoute | null,
  activeConversationId: string | null,
) {
  return Boolean(
    route?.kind === "conversation" &&
      route.conversationId &&
      route.conversationId === activeConversationId,
  );
}
