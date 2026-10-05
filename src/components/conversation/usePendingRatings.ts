import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { getCurrentProfilePendingRatings } from "@/src/services/conversation.service";
import type { PendingRatings } from "@/src/services/conversation.rating.helpers";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";

export function usePendingRatings(enabled = true) {
  const { activeProfile } = useActiveProfile();
  const profileId = activeProfile?.profile.id ?? null;
  const sequence = useRef(0);
  const busy = useRef(false);
  const [result, setResult] = useState<{ profileId: string; data: PendingRatings } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const data = result?.profileId === profileId ? result.data : null;

  const load = useCallback(async (page = 1) => {
    if (!enabled || !profileId || (page > 1 && busy.current)) return;
    const request = ++sequence.current;
    busy.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getCurrentProfilePendingRatings(page);
      if (request !== sequence.current) return;
      if (!response.ok) { setError(response.error.message); return; }
      if (response.profileId !== profileId) return;
      setResult((previous) => ({ profileId, data: {
        ...response.data,
        items: page > 1 && previous?.profileId === profileId && response.data.page === page
          ? [...previous.data.items, ...response.data.items.filter((item) =>
              !previous.data.items.some((old) => old.conversationId === item.conversationId))]
          : response.data.items,
      } }));
    } catch {
      if (request === sequence.current) setError("No pudimos cargar las calificaciones. Intenta de nuevo.");
    } finally {
      if (request === sequence.current) { busy.current = false; setIsLoading(false); }
    }
  }, [enabled, profileId]);

  useFocusEffect(useCallback(() => {
    void load();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => { sequence.current += 1; busy.current = false; subscription.remove(); };
  }, [load]));

  return { data, error, isLoading, profileId, refresh: load,
    loadMore: () => data?.hasMore ? load(data.page + 1) : Promise.resolve() };
}
