import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { supabase } from "@/src/lib/supabase/client";
import {
  markCurrentProfileNotificationRead,
} from "@/src/services/notification.service";
import { openPopup } from "@/src/services/popup.service";
import {
  PushPermissionStatus,
  configurePushNotificationChannels,
  getPushPermissionStatus,
  hasShownPushPermissionPrompt,
  markPushPermissionPromptShown,
  registerCurrentPushDevice,
  requestPushPermission,
  setForegroundConversationId,
  unregisterCurrentPushDevice,
} from "@/src/services/push-notification.service";
import { parsePushNotificationRoute } from "@/src/services/push-notification.helpers";
import { showError } from "@/src/utils/useToast";
import * as Notifications from "expo-notifications";
import {
  router,
  useGlobalSearchParams,
  useSegments,
} from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Linking } from "react-native";

type PushNotificationContextValue = {
  permissionStatus: PushPermissionStatus;
  enablePushNotifications: () => Promise<PushPermissionStatus>;
  openPushNotificationSettings: () => Promise<void>;
  refreshPushPermissionStatus: () => Promise<PushPermissionStatus>;
};

const PushNotificationContext = createContext<PushNotificationContextValue>({
  permissionStatus: "unavailable",
  enablePushNotifications: async () => "unavailable",
  openPushNotificationSettings: async () => {},
  refreshPushPermissionStatus: async () => "unavailable",
});

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    state,
    activeProfile,
    profiles,
    applyUnreadNotificationCount,
    refreshProfiles,
    refreshUnreadNotificationCount,
    switchProfile,
  } = useActiveProfile();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ conversationId?: string | string[] }>();
  const [permissionStatus, setPermissionStatus] =
    useState<PushPermissionStatus>("unavailable");
  const promptUserRef = useRef<string | null>(null);
  const handledResponseRef = useRef<string | null>(null);
  const activeProfileId = activeProfile?.profile.id ?? null;
  const isConversationScreen = segments.includes("(conversation)" as never);
  const foregroundConversationId = isConversationScreen
    ? getSingleParam(params.conversationId)
    : null;

  useEffect(() => {
    setForegroundConversationId(foregroundConversationId);
    return () => setForegroundConversationId(null);
  }, [foregroundConversationId]);

  const refreshPushPermissionStatus = useCallback(async () => {
    const nextStatus = await getPushPermissionStatus();
    setPermissionStatus(nextStatus);
    return nextStatus;
  }, []);

  const enablePushNotifications = useCallback(async () => {
    const nextStatus = await requestPushPermission();
    setPermissionStatus(nextStatus);
    if (nextStatus === "granted") {
      const registration = await registerCurrentPushDevice();
      if (!registration.ok) {
        showError(
          "No pudimos activar las notificaciones",
          __DEV__
            ? `Etapa: ${registration.diagnostic.stage}. Código: ${registration.diagnostic.code}.`
            : "Revisá tu conexión e intentá nuevamente.",
        );
      }
    } else if (nextStatus === "denied") {
      await unregisterCurrentPushDevice();
    }
    return nextStatus;
  }, []);

  const openPushNotificationSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  useEffect(() => {
    if (
      state !== "ready" &&
      state !== "identity_required" &&
      state !== "business_verification_required"
    ) {
      return;
    }

    let active = true;
    const synchronize = async () => {
      await configurePushNotificationChannels();
      const nextStatus = await getPushPermissionStatus();
      if (!active) return;
      setPermissionStatus(nextStatus);
      if (nextStatus === "granted") {
        await registerCurrentPushDevice();
      } else if (nextStatus === "denied") {
        await unregisterCurrentPushDevice();
      }
    };
    void synchronize();

    return () => {
      active = false;
    };
  }, [state]);

  useEffect(() => {
    if (
      permissionStatus !== "undetermined" ||
      (state !== "ready" &&
        state !== "identity_required" &&
        state !== "business_verification_required")
    ) {
      return;
    }

    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const preparePrompt = async () => {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user.id;
      if (
        !active ||
        !userId ||
        promptUserRef.current === userId ||
        await hasShownPushPermissionPrompt(userId)
      ) {
        return;
      }
      promptUserRef.current = userId;
      await markPushPermissionPromptShown(userId);
      timeoutId = setTimeout(() => {
        if (!active) return;
        openPopup({
          type: "summary",
          title: "Activá las notificaciones",
          icon: "bell",
          description:
            "Te avisaremos solo sobre mensajes y cambios importantes en ofertas, entregas y verificaciones. La pantalla bloqueada no mostrará detalles privados.",
          dismissOnBackdropPress: false,
          actions: [
            {
              id: "push-notifications-later",
              label: "Ahora no",
              icon: "arrow-left",
            },
            {
              id: "enable-push-notifications",
              label: "Activar",
              icon: "bell",
              onPress: async () => {
                await enablePushNotifications();
                return true;
              },
            },
          ],
        });
      }, 1200);
    };
    void preparePrompt();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enablePushNotifications, permissionStatus, state]);

  const handleNotificationResponse = useCallback(async (
    response: Notifications.NotificationResponse,
  ) => {
    if (state === "loading" || state === "signed_out") return false;
    const route = parsePushNotificationRoute(
      response.notification.request.content.data,
    );
    if (!route) return true;

    if (route.profileId && route.profileId !== activeProfileId) {
      const ownedProfile = profiles.some(
        (profile) => profile.profile.id === route.profileId,
      );
      const activated = ownedProfile
        ? await switchProfile(route.profileId)
        : await refreshProfiles(route.profileId);
      if (!activated) return true;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (route.notificationId) {
      const result = await markCurrentProfileNotificationRead(
        route.notificationId,
      );
      if (result.ok) {
        applyUnreadNotificationCount(result.data.remainingUnreadCount);
      }
    }

    if (route.kind === "conversation" && route.conversationId) {
      router.push({
        pathname: "/(conversation)/offer",
        params: { conversationId: route.conversationId },
      });
    } else if (route.kind === "purchaseRequest" && route.purchaseRequestId) {
      router.push({
        pathname: "/request/[purchaseRequestId]",
        params: { purchaseRequestId: route.purchaseRequestId },
      });
    } else if (route.kind === "identityVerification") {
      await refreshProfiles(route.profileId);
      router.push("/(auth)/identity-verification");
    } else if (route.kind === "businessVerification") {
      await refreshProfiles(route.profileId);
      router.push({
        pathname: "/(detail)/business-verification",
        params: { title: "Verificar negocio", hideMenu: "true" },
      });
    } else {
      router.push({
        pathname: "/(detail)/notifications",
        params: { title: "Notificaciones", hideMenu: "true" },
      });
    }

    return true;
  }, [
    activeProfileId,
    applyUnreadNotificationCount,
    profiles,
    refreshProfiles,
    state,
    switchProfile,
  ]);

  const consumeNotificationResponse = useCallback(async (
    response: Notifications.NotificationResponse,
  ) => {
    const responseId = response.notification.request.identifier;
    if (!responseId || handledResponseRef.current === responseId) return;

    handledResponseRef.current = responseId;
    try {
      const handled = await handleNotificationResponse(response);
      if (!handled) {
        handledResponseRef.current = null;
        return;
      }
      await Notifications.clearLastNotificationResponseAsync();
    } catch {
      if (handledResponseRef.current === responseId) {
        handledResponseRef.current = null;
      }
    }
  }, [handleNotificationResponse]);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const route = parsePushNotificationRoute(notification.request.content.data);
        if (route?.notificationId && route.profileId === activeProfileId) {
          void refreshUnreadNotificationCount();
        }
      },
    );
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void consumeNotificationResponse(response);
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [
    activeProfileId,
    consumeNotificationResponse,
    refreshUnreadNotificationCount,
  ]);

  useEffect(() => {
    if (state === "loading" || state === "signed_out") return;
    let active = true;
    const handleInitialResponse = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!active || !response) return;
      await consumeNotificationResponse(response);
    };
    void handleInitialResponse();
    return () => {
      active = false;
    };
  }, [consumeNotificationResponse, state]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      void refreshPushPermissionStatus().then((nextStatus) => {
        if (nextStatus === "granted") {
          void registerCurrentPushDevice();
        } else if (nextStatus === "denied") {
          void unregisterCurrentPushDevice();
        }
      });
    });
    return () => subscription.remove();
  }, [refreshPushPermissionStatus]);

  useEffect(() => {
    if (
      permissionStatus !== "granted" ||
      (state !== "ready" &&
        state !== "identity_required" &&
        state !== "business_verification_required")
    ) {
      return;
    }
    const subscription = Notifications.addPushTokenListener((devicePushToken) => {
      void registerCurrentPushDevice(devicePushToken);
    });
    return () => subscription.remove();
  }, [permissionStatus, state]);

  const value = useMemo(() => ({
    permissionStatus,
    enablePushNotifications,
    openPushNotificationSettings,
    refreshPushPermissionStatus,
  }), [
    enablePushNotifications,
    openPushNotificationSettings,
    permissionStatus,
    refreshPushPermissionStatus,
  ]);

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  return useContext(PushNotificationContext);
}
