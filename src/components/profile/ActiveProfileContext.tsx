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
  revision: number;
  refreshProfiles: (preferredProfileId?: string | null) => Promise<boolean>;
  switchProfile: (profileId: string) => Promise<boolean>;
};

const ActiveProfileContext = createContext<ActiveProfileContextValue>({
  state: "loading",
  profiles: [],
  activeProfile: null,
  revision: 0,
  refreshProfiles: async () => false,
  switchProfile: async () => false,
});

function getStateForProfile(profile: ActiveProfileSummary | null): ActiveProfileState {
  if (!profile) return "no_profile";
  return profile.setupStatus === "ready" ? "ready" : "setup_required";
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
  const activeRefreshCountRef = useRef(0);

  const clearMemory = useCallback(() => {
    refreshSequenceRef.current += 1;
    abortProfileScopedRequests();
    setProfiles([]);
    setActiveProfile(null);
    setShouldRetryRefresh(false);
    setCurrentProfileSummary(null);
    setCurrentUserProfileCount(0);
  }, []);

  const refreshProfiles = useCallback(
    async (preferredProfileId?: string | null) => {
      const refreshSequence = ++refreshSequenceRef.current;
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

        const profileResult = await listCurrentUserProfiles();
        if (refreshSequence !== refreshSequenceRef.current) return false;
        if (!profileResult.ok) {
          setShouldRetryRefresh(true);
          return false;
        }

        setShouldRetryRefresh(false);
        const nextProfiles = profileResult.data;
        setCurrentUserProfileCount(nextProfiles.length);
        if (nextProfiles.length === 0) {
          setProfiles([]);
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
      setActiveProfile(selectedProfile);
      setCurrentProfileSummary(selectedProfile);
      setState(getStateForProfile(selectedProfile));
      setRevision((value) => value + 1);
      router.replace("/");
      return true;
    },
    [profiles]
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

  const value = useMemo(
    () => ({
      state,
      profiles,
      activeProfile,
      revision,
      refreshProfiles,
      switchProfile,
    }),
    [activeProfile, profiles, refreshProfiles, revision, state, switchProfile]
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
