import {
  abortProfileScopedRequests,
  ActiveProfileSummary,
  clearLegacySavedProfiles,
  getStoredActiveProfileId,
  isInitialProfileBootstrapPending,
  listCurrentUserProfiles,
  persistActiveProfileId,
  setCurrentProfileSummary,
  setCurrentUserProfileCount,
  subscribeActiveProfileRefresh,
} from "@/src/services/active.profile.service";
import { clearBuyerHomeFilters } from "@/src/services/buyer.home.filters.service";
import { closePopup } from "@/src/services/popup.service";
import { clearSellerHomeFilters } from "@/src/services/seller.home.filters.service";
import { getCurrentProfileUnreadNotificationCount } from "@/src/services/notification.service";
import {
  ALL_SEGMENTS_SVG_NAME,
  setSelectedSegmentSvgName,
} from "@/src/services/segment.service";
import { supabase } from "@/src/lib/supabase/client";
import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

export type ActiveProfileState =
  | "loading"
  | "signed_out"
  | "no_profile"
  | "setup_required"
  | "ready";

type ActiveProfileContextValue = {
  state: ActiveProfileState;
  profiles: ActiveProfileSummary[];
  activeProfile: ActiveProfileSummary | null;
  unreadNotificationCount: number;
  revision: number;
  applyUnreadNotificationCount: (count: number) => void;
  refreshUnreadNotificationCount: () => Promise<boolean>;
  refreshProfiles: (preferredProfileId?: string | null) => Promise<boolean>;
  switchProfile: (profileId: string) => Promise<boolean>;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue>({
  state: "loading",
  profiles: [],
  activeProfile: null,
  unreadNotificationCount: 0,
  revision: 0,
  applyUnreadNotificationCount: () => {},
  refreshUnreadNotificationCount: async () => false,
  refreshProfiles: async () => false,
  switchProfile: async () => false,
});

function getStateForProfile(profile: ActiveProfileSummary | null): ActiveProfileState {
  if (!profile) return "no_profile";
  return profile.setupStatus === "ready" ? "ready" : "setup_required";
}

function isInvalidAuthSession(error: {
  name: string;
  status?: number;
  code?: string;
}) {
  return (
    error.name === "AuthSessionMissingError" ||
    error.status === 401 ||
    error.status === 403 ||
    error.status === 404 ||
    error.code === "bad_jwt" ||
    error.code === "session_not_found" ||
    error.code === "session_expired" ||
    error.code === "refresh_token_not_found" ||
    error.code === "refresh_token_already_used" ||
    error.code === "user_not_found"
  );
}

export function ActiveProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ActiveProfileState>("loading");
  const [profiles, setProfiles] = useState<ActiveProfileSummary[]>([]);
  const [activeProfile, setActiveProfile] = useState<ActiveProfileSummary | null>(
    null
  );
  const [shouldRetryRefresh, setShouldRetryRefresh] = useState(false);
  const [revision, setRevision] = useState(0);
  const refreshSequenceRef = useRef(0);
  const unreadRefreshSequenceRef = useRef(0);
  const activeRefreshCountRef = useRef(0);
  const activeProfileRef = useRef<ActiveProfileSummary | null>(null);
  activeProfileRef.current = activeProfile;

  const clearMemory = useCallback(() => {
    refreshSequenceRef.current += 1;
    unreadRefreshSequenceRef.current += 1;
    abortProfileScopedRequests();
    setProfiles([]);
    activeProfileRef.current = null;
    setActiveProfile(null);
    setShouldRetryRefresh(false);
    setCurrentProfileSummary(null);
    setCurrentUserProfileCount(0);
  }, []);

  const refreshProfiles = useCallback(
    async (preferredProfileId?: string | null) => {
      const refreshSequence = ++refreshSequenceRef.current;
      unreadRefreshSequenceRef.current += 1;
      activeRefreshCountRef.current += 1;
      try {
        const sessionResult = await supabase.auth.getSession();
        if (refreshSequence !== refreshSequenceRef.current) return false;
        const userId = sessionResult.data.session?.user.id;
        if (!userId) {
          setShouldRetryRefresh(false);
          clearMemory();
          setState("signed_out");
          return false;
        }

        const userResult = await supabase.auth.getUser();
        if (refreshSequence !== refreshSequenceRef.current) return false;
        if (!userResult.data.user) {
          if (userResult.error && isInvalidAuthSession(userResult.error)) {
            await supabase.auth.signOut({ scope: "local" });
            clearMemory();
            setState("signed_out");
          } else {
            setShouldRetryRefresh(true);
          }
          return false;
        }

        const profileResult = await listCurrentUserProfiles();
        if (refreshSequence !== refreshSequenceRef.current) return false;
        if (!profileResult.ok) {
          if (profileResult.error.code === "account_deletion_pending") {
            await supabase.auth.signOut({ scope: "local" });
            clearMemory();
            setState("signed_out");
            router.replace("/(auth)/auth");
            return false;
          }
          setShouldRetryRefresh(true);
          return false;
        }

        setShouldRetryRefresh(false);
        const nextProfiles = profileResult.data;
        setCurrentUserProfileCount(nextProfiles.length);
        if (nextProfiles.length === 0) {
          setProfiles([]);
          activeProfileRef.current = null;
          setActiveProfile(null);
          setCurrentProfileSummary(null);
          setState("no_profile");
          return preferredProfileId == null;
        }

        let storedProfileId = preferredProfileId ?? null;
        if (!storedProfileId) {
          try {
            storedProfileId = await getStoredActiveProfileId(userId);
          } catch {
            storedProfileId = null;
          }
        }
        if (refreshSequence !== refreshSequenceRef.current) return false;
        const nextActiveProfile =
          nextProfiles.find((item) => item.profile.id === storedProfileId) ??
          nextProfiles.find((item) => item.profile.is_default) ??
          nextProfiles[0];

        try {
          await persistActiveProfileId(userId, nextActiveProfile.profile.id);
        } catch {
          // Device persistence is best-effort; the database default remains valid.
        }
        if (refreshSequence !== refreshSequenceRef.current) return false;
        setProfiles(nextProfiles);
        activeProfileRef.current = nextActiveProfile;
        setActiveProfile(nextActiveProfile);
        setCurrentProfileSummary(nextActiveProfile);
        setState(getStateForProfile(nextActiveProfile));
        return (
          preferredProfileId == null ||
          nextActiveProfile.profile.id === preferredProfileId
        );
      } finally {
        activeRefreshCountRef.current = Math.max(
          0,
          activeRefreshCountRef.current - 1
        );
      }
    },
    [clearMemory]
  );

  const applyUnreadNotificationCount = useCallback((count: number) => {
    const current = activeProfileRef.current;
    if (!current) return;

    const unreadCount = Math.max(0, Math.trunc(Number.isFinite(count) ? count : 0));
    if (current.unreadCount === unreadCount) return;

    const nextActiveProfile = { ...current, unreadCount };
    activeProfileRef.current = nextActiveProfile;
    setActiveProfile(nextActiveProfile);
    setProfiles((items) =>
      items.map((item) =>
        item.profile.id === nextActiveProfile.profile.id
          ? { ...item, unreadCount }
          : item
      )
    );
    setCurrentProfileSummary(nextActiveProfile);
  }, []);

  const refreshUnreadNotificationCount = useCallback(async () => {
    const profileId = activeProfileRef.current?.profile.id;
    if (!profileId) return false;

    const refreshSequence = ++unreadRefreshSequenceRef.current;
    const result = await getCurrentProfileUnreadNotificationCount();
    if (
      refreshSequence !== unreadRefreshSequenceRef.current ||
      activeProfileRef.current?.profile.id !== profileId
    ) {
      return false;
    }
    if (!result.ok) return false;

    applyUnreadNotificationCount(result.data);
    return true;
  }, [applyUnreadNotificationCount]);

  const switchProfile = useCallback(
    async (profileId: string) => {
      const selectedProfile = profiles.find(
        (profile) => profile.profile.id === profileId
      );
      if (!selectedProfile) return false;

      const sessionResult = await supabase.auth.getSession();
      const userId = sessionResult.data.session?.user.id;
      if (!userId) return false;

      refreshSequenceRef.current += 1;
      unreadRefreshSequenceRef.current += 1;
      abortProfileScopedRequests();
      try {
        await persistActiveProfileId(userId, selectedProfile.profile.id);
      } catch {
        // Keep switching in-memory even when device storage is unavailable.
      }
      clearBuyerHomeFilters();
      clearSellerHomeFilters();
      setSelectedSegmentSvgName(ALL_SEGMENTS_SVG_NAME);
      closePopup();
      activeProfileRef.current = selectedProfile;
      setActiveProfile(selectedProfile);
      setCurrentProfileSummary(selectedProfile);
      setState(getStateForProfile(selectedProfile));
      setRevision((value) => value + 1);
      void refreshUnreadNotificationCount();
      router.replace("/");
      return true;
    },
    [profiles, refreshUnreadNotificationCount]
  );

  useEffect(() => {
    void clearLegacySavedProfiles();
    void refreshProfiles();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        clearMemory();
        setState("signed_out");
        return;
      }

      if (isInitialProfileBootstrapPending()) return;
      void refreshProfiles();
    });
    const unsubscribeRefresh = subscribeActiveProfileRefresh(
      (preferredProfileId) => refreshProfiles(preferredProfileId)
    );

    return () => {
      unsubscribeRefresh();
      data.subscription.unsubscribe();
    };
  }, [clearMemory, refreshProfiles]);

  useEffect(() => {
    if (!shouldRetryRefresh) return;
    const retryId = setInterval(() => {
      if (activeRefreshCountRef.current > 0) return;
      void refreshProfiles();
    }, 3000);
    return () => clearInterval(retryId);
  }, [refreshProfiles, shouldRetryRefresh]);

  useEffect(() => {
    if (state !== "ready" || !activeProfile?.profile.id) return;

    const intervalId = setInterval(() => {
      if (AppState.currentState === "active") {
        void refreshUnreadNotificationCount();
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [activeProfile?.profile.id, refreshUnreadNotificationCount, state]);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const isReturningToApp =
        /inactive|background/.test(previousState) && nextState === "active";
      previousState = nextState;
      if (isReturningToApp) void refreshProfiles();
    });

    return () => subscription.remove();
  }, [refreshProfiles]);

  const value = useMemo(
    () => ({
      state,
      profiles,
      activeProfile,
      unreadNotificationCount: activeProfile?.unreadCount ?? 0,
      revision,
      applyUnreadNotificationCount,
      refreshUnreadNotificationCount,
      refreshProfiles,
      switchProfile,
    }),
    [
      activeProfile,
      applyUnreadNotificationCount,
      profiles,
      refreshProfiles,
      refreshUnreadNotificationCount,
      revision,
      state,
      switchProfile,
    ]
  );

  return (
    <ActiveProfileContext.Provider value={value}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  return useContext(ActiveProfileContext);
}

export function ActiveProfileBootstrapGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useActiveProfile();
  return state === "loading" ? null : <>{children}</>;
}
