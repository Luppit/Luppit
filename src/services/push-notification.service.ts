import { RPC_FUNCTIONS } from "@/src/db/functions";
import { supabase } from "@/src/lib/supabase/client";
import { fromAppError, fromSupabaseError } from "@/src/lib/supabase/errors";
import { createSecureKVStorage } from "@/src/store/factory";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  createPushRegistrationDiagnostic,
  parsePushNotificationRoute,
  shouldSuppressForegroundPush,
} from "./push-notification.helpers";
import type { PushRegistrationDiagnostic } from "./push-notification.helpers";

export type PushPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined"
  | "unavailable";

const storage = createSecureKVStorage();
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

function mapPermissionStatus(
  permission: Notifications.NotificationPermissionsStatus,
): PushPermissionStatus {
  if (permission.granted) return "granted";
  if (permission.status === Notifications.PermissionStatus.DENIED) {
    return "denied";
  }
  return "undetermined";
}

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (!isNativePushPlatform()) return "unavailable";
  try {
    return mapPermissionStatus(await Notifications.getPermissionsAsync());
  } catch {
    return "unavailable";
  }
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (!isNativePushPlatform()) return "unavailable";
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
    return "unavailable";
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
  if (permission !== "granted") {
    return pushRegistrationFailure(
      "permission",
      fromAppError("unknown"),
      undefined,
      `permission_${permission}`,
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
    previousToken = await storage.getItem(tokenStorageKey);
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
      await storage.setItem(tokenStorageKey, token);
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
    const token = await storage.getItem(tokenStorageKey);
    if (!token) return true;

    const result = await supabase.rpc(
      RPC_FUNCTIONS.UNREGISTER_CURRENT_PUSH_DEVICE,
      { p_expo_push_token: token },
    );
    if (result.error) return false;
    await storage.removeItem(tokenStorageKey);
    return true;
  } catch {
    return false;
  }
}

export async function hasShownPushPermissionPrompt(userId: string) {
  return (await storage.getItem(promptStorageKey(userId))) === "true";
}

export async function markPushPermissionPromptShown(userId: string) {
  await storage.setItem(promptStorageKey(userId), "true");
}
