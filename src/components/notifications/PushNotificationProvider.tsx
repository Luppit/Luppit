import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { supabase } from "@/src/lib/supabase/client";
import {
  markCurrentProfileNotificationRead,
} from "@/src/services/notification.service";
import {
  hasOpenPopup,
  openPopup,
  subscribePopup,
} from "@/src/services/popup.service";
import type { PushPermissionStatus } from "@/src/services/push-notification.service";
import {
  configurePushNotificationChannels,
  getPushPermissionStatus,
  hasShownPushPermissionPrompt,
  markPushPermissionPromptShown,
  registerCurrentPushDevice,
  requestPushPermission,
  setForegroundConversationId,
  unregisterCurrentPushDevice,
} from "@/src/services/push-notification.service";
import {
  canRegisterForPush,
  parsePushNotificationRoute,
  shouldPresentPushPermissionPrompt,
  shouldUnregisterPushDevice,
} from "@/src/services/push-notification.helpers";
import { showError } from "@/src/utils/useToast";
import * as Notifications from "expo-notifications";
import {
  router,
  useGlobalSearchParams,
  usePathname,
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
  permissionCanAskAgain: boolean;
  enablePushNotifications: () => Promise<PushPermissionStatus>;
  openPushNotificationSettings: () => Promise<void>;
  refreshPushPermissionStatus: () => Promise<PushPermissionStatus>;
  presentInitialPushPermissionPrompt: (
    context: "home" | "businessVerificationPending",
  ) => Promise<boolean>;
};

const PushNotificationContext = createContext<PushNotificationContextValue>({
  permissionStatus: "unavailable",
  permissionCanAskAgain: false,
  enablePushNotifications: async () => "unavailable",
  openPushNotificationSettings: async () => {},
  refreshPushPermissionStatus: async () => "unavailable",
  presentInitialPushPermissionPrompt: async () => false,
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
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ conversationId?: string | string[] }>();
  const [permissionState, setPermissionState] = useState({
    status: "unavailable" as PushPermissionStatus,
    canAskAgain: false,
  });
  const [popupIsOpen, setPopupIsOpen] = useState(hasOpenPopup);
  const promptUserRef = useRef<string | null>(null);
  const promptInFlightRef = useRef(false);
  const handledResponseRef = useRef<string | null>(null);
  const activeProfileId = activeProfile?.profile.id ?? null;
  const profileStateRef = useRef(state);
  const activeProfileIdRef = useRef(activeProfileId);
  const pathnameRef = useRef(pathname);
  profileStateRef.current = state;
  activeProfileIdRef.current = activeProfileId;
  pathnameRef.current = pathname;
  const isConversationScreen = segments.includes("(conversation)" as never);
  const foregroundConversationId = isConversationScreen
    ? getSingleParam(params.conversationId)
    : null;

  useEffect(() => {
    setForegroundConversationId(foregroundConversationId);
    return () => setForegroundConversationId(null);
  }, [foregroundConversationId]);

  useEffect(
    () => subscribePopup(({ config }) => setPopupIsOpen(config !== null)),
    [],
  );

  const refreshPushPermissionStatus = useCallback(async () => {
    const nextPermission = await getPushPermissionStatus();
    setPermissionState(nextPermission);
    return nextPermission.status;
  }, []);

  const enablePushNotifications = useCallback(async () => {
    const nextPermission = await requestPushPermission();
    setPermissionState(nextPermission);
    if (canRegisterForPush(nextPermission.status)) {
      const registration = await registerCurrentPushDevice();
      if (!registration.ok) {
        showError(
          "No pudimos activar las notificaciones",
          __DEV__
            ? `Etapa: ${registration.diagnostic.stage}. Código: ${registration.diagnostic.code}.`
            : "Revisá tu conexión e intentá nuevamente.",
        );
      }
    } else if (shouldUnregisterPushDevice(nextPermission.status)) {
      await unregisterCurrentPushDevice();
    }
    return nextPermission.status;
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
      const nextPermission = await getPushPermissionStatus();
      if (!active) return;
      setPermissionState(nextPermission);
      if (canRegisterForPush(nextPermission.status)) {
        await registerCurrentPushDevice();
      } else if (shouldUnregisterPushDevice(nextPermission.status)) {
        await unregisterCurrentPushDevice();
      }
    };
    void synchronize();

    return () => {
      active = false;
    };
  }, [state]);

  const presentInitialPushPermissionPrompt = useCallback(
    async (context: "home" | "businessVerificationPending") => {
      if (promptInFlightRef.current) return false;
      promptInFlightRef.current = true;
      try {
        const nextPermission = await getPushPermissionStatus();
        setPermissionState(nextPermission);
        const session = await supabase.auth.getSession();
        const userId = session.data.session?.user.id;
        if (!userId || promptUserRef.current === userId) return false;

        const hasShownPrompt = await hasShownPushPermissionPrompt(userId);
        const currentState = profileStateRef.current;
        const currentPathname = pathnameRef.current;
        const isEligibleSurface =
          context === "home"
            ? currentState === "ready" && currentPathname === "/"
            : currentState === "business_verification_required" &&
              currentPathname === "/business-verification";
        if (
          !shouldPresentPushPermissionPrompt({
            permissionStatus: nextPermission.status,
            isAuthenticated: true,
            hasActiveProfile: activeProfileIdRef.current != null,
            isAppActive: AppState.currentState === "active",
            isEligibleSurface,
            hasShownPrompt,
            hasOpenPopup: popupIsOpen || hasOpenPopup(),
          })
        ) {
          return false;
        }

        promptUserRef.current = userId;
        openPopup({
          type: "summary",
          title: "Activá las notificaciones",
          icon: "bell",
          description:
            context === "businessVerificationPending"
              ? "Te avisaremos cuando cambie el estado de tu verificación y cuando tengas mensajes u ofertas."
              : "Te avisaremos sobre mensajes y cambios importantes en ofertas, entregas y verificaciones. No mostraremos detalles privados en la pantalla bloqueada.",
          dismissOnBackdropPress: false,
          actions: [
            {
              id: "push-notifications-later",
              label: "No",
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
        try {
          await markPushPermissionPromptShown(userId);
        } catch {
          // The in-memory guard prevents another prompt during this session.
        }
        return true;
      } finally {
        promptInFlightRef.current = false;
      }
    },
    [enablePushNotifications, popupIsOpen],
  );

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
      if (
        nextState !== "active" ||
        (state !== "ready" &&
          state !== "identity_required" &&
          state !== "business_verification_required")
      ) return;
      void refreshPushPermissionStatus().then((nextStatus) => {
        if (canRegisterForPush(nextStatus)) {
          void registerCurrentPushDevice();
        } else if (shouldUnregisterPushDevice(nextStatus)) {
          void unregisterCurrentPushDevice();
        }
      });
    });
    return () => subscription.remove();
  }, [refreshPushPermissionStatus, state]);

  useEffect(() => {
    if (
      !canRegisterForPush(permissionState.status) ||
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
  }, [permissionState.status, state]);

  const value = useMemo(() => ({
    permissionStatus: permissionState.status,
    permissionCanAskAgain: permissionState.canAskAgain,
    enablePushNotifications,
    openPushNotificationSettings,
    presentInitialPushPermissionPrompt,
    refreshPushPermissionStatus,
  }), [
    enablePushNotifications,
    openPushNotificationSettings,
    permissionState.canAskAgain,
    permissionState.status,
    presentInitialPushPermissionPrompt,
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
