import { getCurrentBuyerProfileSetup } from "@/src/services/buyer.profile.setup.service";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";

type PublishSetupStatus = "checking" | "ready" | "setup_required" | "error";

export function useBuyerPublishSetup(enabled: boolean) {
  const [status, setStatus] = useState<PublishSetupStatus>("checking");
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    setStatus("checking");
    if (!enabled) return;
    const version = ++requestVersion.current;
    try {
      const result = await getCurrentBuyerProfileSetup();
      if (version === requestVersion.current) {
        setStatus(!result.ok ? "error" : result.data.isComplete ? "ready" : "setup_required");
      }
    } catch {
      if (version === requestVersion.current) setStatus("error");
    }
  }, [enabled]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]));

  const completeSetup = useCallback(() => {
    router.push({ pathname: "/(tabs)", params: { resumeBuyerDraft: "true" } });
  }, []);

  return { status: enabled ? status : "checking", refresh, completeSetup } as const;
}
