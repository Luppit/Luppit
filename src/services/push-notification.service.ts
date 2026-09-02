import { RPC_FUNCTIONS } from "@/src/db/functions";
import { supabase } from "@/src/lib/supabase/client";
import { fromAppError, fromSupabaseError } from "@/src/lib/supabase/errors";
import { createKVStorage, createSecureKVStorage } from "@/src/store/factory";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  canRegisterForPush,
  createPushRegistrationDiagnostic,
  mapPushPermissionState,
  parsePushNotificationRoute,
  shouldSuppressForegroundPush,
} from "./push-notification.helpers";
import type {
  NativePushPermissionInput,
  PushPermissionState,
  PushRegistrationDiagnostic,
} from "./push-notification.helpers";

export type {
  PushPermissionState,
  PushPermissionStatus,
} from "./push-notification.helpers";

const secureStorage = createSecureKVStorage();
const promptStorage = createKVStorage();
const environmentKey = (
  process.env.EXPO_PUBLIC_ENV ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "dev"
).replace(/[^a-zA-Z0-9_-]/g, "_");
const tokenStorageKey = `push_token:${environmentKey}`;
let activeConversationId: string | null = null;

type PushDeviceRegistrationResult =
  | { ok: true; data: unknown }
  | {
    ok: false;
    error: ReturnType<typeof fromAppError>;
    diagnostic: PushRegistrationDiagnostic;
  };

let pushDeviceRegistrationPromise: Promise<PushDeviceRegistrationResult> | null =
  null;

function pushRegistrationFailure(
  stage: PushRegistrationDiagnostic["stage"],
  error: ReturnType<typeof fromAppError>,
  source?: unknown,
  fallbackCode?: string,
): PushDeviceRegistrationResult {
  const diagnostic = createPushRegistrationDiagnostic(
    stage,
    source,
    fallbackCode,
  );
  if (__DEV__) {
    console.warn("[push-registration]", diagnostic);
  }
  return { ok: false, error, diagnostic };
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const route = parsePushNotificationRoute(
      notification.request.content.data,
    );
    const suppressBanner = shouldSuppressForegroundPush(
      route,
      activeConversationId,
    );
    return {
      shouldShowBanner: !suppressBanner,
      shouldShowList: true,
      shouldPlaySound: !suppressBanner,
      shouldSetBadge: false,
    };
  },
});

function isNativePushPlatform(): boolean {
  return Platform.OS === "android" || Platform.OS === "ios";
}

function promptStorageKey(userId: string) {
  return `push_prompt_shown_v2:${environmentKey}:${userId}`;
}

function legacyPromptStorageKey(userId: string) {
  return `push_prompt_shown:${environmentKey}:${userId}`;
}

function getProjectId() {
  return Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
}

function getBuildNumber() {
  if (Platform.OS === "ios") return Constants.expoConfig?.ios?.buildNumber;
  const versionCode = Constants.expoConfig?.android?.versionCode;
  return versionCode == null ? null : String(versionCode);
}

export function setForegroundConversationId(conversationId: string | null) {
  activeConversationId = conversationId;
}

export async function configurePushNotificationChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync("messages", {
      name: "Mensajes",
      description: "Mensajes nuevos en conversaciones activas.",
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
      sound: "default",
      vibrationPattern: [0, 200, 150, 200],
    }),
    Notifications.setNotificationChannelAsync("critical_updates", {
      name: "Actualizaciones importantes",
      description: "Cambios importantes en ofertas, entregas y verificaciones.",
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      showBadge: false,
      sound: "default",
      vibrationPattern: [0, 250, 150, 250],
    }),
  ]);
}

function getIosAuthorizationStatus(
  permission: Notifications.NotificationPermissionsStatus,
): NativePushPermissionInput["iosStatus"] {
  switch (permission.ios?.status) {
    case Notifications.IosAuthorizationStatus.AUTHORIZED:
      return "authorized";
    case Notifications.IosAuthorizationStatus.PROVISIONAL:
      return "provisional";
    case Notifications.IosAuthorizationStatus.EPHEMERAL:
      return "ephemeral";
    case Notifications.IosAuthorizationStatus.DENIED:
      return "denied";
    case Notifications.IosAuthorizationStatus.NOT_DETERMINED:
      return "not_determined";
    default:
      return null;
  }
}

function mapPermissionStatus(
  permission: Notifications.NotificationPermissionsStatus,
): PushPermissionState {
  const status = permission.status === Notifications.PermissionStatus.GRANTED
    ? "granted"
    : permission.status === Notifications.PermissionStatus.DENIED
    ? "denied"
    : "undetermined";
  return mapPushPermissionState({
    platform: Platform.OS === "ios" ? "ios" : "android",
    granted: permission.granted,
    status,
    canAskAgain: permission.canAskAgain,
    iosStatus: getIosAuthorizationStatus(permission),
  });
}

export async function getPushPermissionStatus(): Promise<PushPermissionState> {
  if (!isNativePushPlatform()) {
    return { status: "unavailable", canAskAgain: false };
  }
  try {
    return mapPermissionStatus(await Notifications.getPermissionsAsync());
  } catch {
    return { status: "unavailable", canAskAgain: false };
  }
}

export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!isNativePushPlatform()) {
    return { status: "unavailable", canAskAgain: false };
  }
  try {
    await configurePushNotificationChannels();
    const permission = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return mapPermissionStatus(permission);
  } catch {
    return { status: "unavailable", canAskAgain: false };
  }
}

async function performCurrentPushDeviceRegistration(
  providedDevicePushToken?: Notifications.DevicePushToken,
): Promise<PushDeviceRegistrationResult> {
  if (!isNativePushPlatform()) {
    return pushRegistrationFailure(
      "platform",
      fromAppError("unknown"),
      undefined,
      "unsupported_platform",
    );
  }

  const permission = await getPushPermissionStatus();
  const projectId = getProjectId();
  if (!canRegisterForPush(permission.status)) {
    return pushRegistrationFailure(
      "permission",
      fromAppError("unknown"),
      undefined,
      `permission_${permission.status}`,
    );
  }
  if (!projectId) {
    return pushRegistrationFailure(
      "configuration",
      fromAppError("unknown"),
      undefined,
      "missing_project_id",
    );
  }

  let devicePushToken = providedDevicePushToken;
  if (!devicePushToken) {
    try {
      devicePushToken = await Notifications.getDevicePushTokenAsync();
    } catch (error) {
      return pushRegistrationFailure(
        "native_token",
        fromAppError("network"),
        error,
      );
    }
  }

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId,
      devicePushToken,
    })).data;
  } catch (error) {
    return pushRegistrationFailure(
      "expo_token",
      fromAppError("network"),
      error,
    );
  }

  let previousToken: string | null = null;
  try {
    previousToken = await secureStorage.getItem(tokenStorageKey);
  } catch {
    // Registration can continue without the previous local token.
  }

  try {
    const result = await supabase.rpc(
      RPC_FUNCTIONS.REGISTER_CURRENT_PUSH_DEVICE,
      {
        p_expo_push_token: token,
        p_platform: Platform.OS,
        p_app_version: Constants.expoConfig?.version,
        p_build_number: getBuildNumber() ?? undefined,
        p_previous_expo_push_token: previousToken ?? undefined,
      },
    );
    if (result.error) {
      return pushRegistrationFailure(
        "supabase",
        fromSupabaseError(result.error),
        result.error,
        "rpc_error",
      );
    }

    try {
      await secureStorage.setItem(tokenStorageKey, token);
    } catch {
      // The remote device registration succeeded; local caching is best effort.
    }
    return { ok: true, data: result.data };
  } catch (error) {
    return pushRegistrationFailure(
      "supabase",
      fromAppError("network"),
      error,
      "request_failed",
    );
  }
}

async function coordinateCurrentPushDeviceRegistration(
  devicePushToken?: Notifications.DevicePushToken,
) {
  try {
    return await performCurrentPushDeviceRegistration(devicePushToken);
  } finally {
    pushDeviceRegistrationPromise = null;
  }
}

export function registerCurrentPushDevice(
  devicePushToken?: Notifications.DevicePushToken,
): Promise<PushDeviceRegistrationResult> {
  if (pushDeviceRegistrationPromise) return pushDeviceRegistrationPromise;
  pushDeviceRegistrationPromise = coordinateCurrentPushDeviceRegistration(
    devicePushToken,
  );
  return pushDeviceRegistrationPromise;
}

export async function unregisterCurrentPushDevice() {
  try {
    const token = await secureStorage.getItem(tokenStorageKey);
    if (!token) return true;

    const result = await supabase.rpc(
      RPC_FUNCTIONS.UNREGISTER_CURRENT_PUSH_DEVICE,
      { p_expo_push_token: token },
    );
    if (result.error) return false;
    await secureStorage.removeItem(tokenStorageKey);
    return true;
  } catch {
    return false;
  }
}

export async function hasShownPushPermissionPrompt(userId: string) {
  try {
    if ((await promptStorage.getItem(promptStorageKey(userId))) === "true") {
      return true;
    }
  } catch {
    // Fall through to the legacy marker when installation storage is unavailable.
  }

  try {
    if ((await secureStorage.getItem(legacyPromptStorageKey(userId))) !== "true") {
      return false;
    }
    try {
      await promptStorage.setItem(promptStorageKey(userId), "true");
      await secureStorage.removeItem(legacyPromptStorageKey(userId));
    } catch {
      // The legacy marker still prevents a repeated prompt.
    }
    return true;
  } catch {
    return false;
  }
}

export async function markPushPermissionPromptShown(userId: string) {
  await promptStorage.setItem(promptStorageKey(userId), "true");
  try {
    await secureStorage.removeItem(legacyPromptStorageKey(userId));
  } catch {
    // The installation-scoped marker is authoritative.
  }
}
