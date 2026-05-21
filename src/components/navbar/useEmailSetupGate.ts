import { getCurrentProfileEmailSetupStatus } from "@/src/services/profile.service";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";

type EmailSetupGateState = {
  isAccountSetupBlocked: boolean;
  isLoadingEmailSetupStatus: boolean;
};

export function normalizeTabPath(path: string) {
  const withoutGroups = path.replace(/\/\([^/]+\)/g, "");
  const withoutIndex = withoutGroups.replace(/\/index$/, "");
  return withoutIndex || "/";
}

export function isEmailSetupAllowedTabPath(path: string) {
  const normalizedPath = normalizeTabPath(path);
  return normalizedPath === "/" || normalizedPath === "/profile";
}

export function useEmailSetupGate(): EmailSetupGateState {
  const [state, setState] = React.useState<EmailSetupGateState>({
    isAccountSetupBlocked: false,
    isLoadingEmailSetupStatus: true,
  });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const loadEmailSetupStatus = async () => {
        setState((current) => ({
          ...current,
          isLoadingEmailSetupStatus: true,
        }));

        const result = await getCurrentProfileEmailSetupStatus();
        if (!active) return;

        if (!result.ok) {
          setState({
            isAccountSetupBlocked: false,
            isLoadingEmailSetupStatus: false,
          });
          return;
        }

        setState({
          isAccountSetupBlocked: !result.data.isComplete,
          isLoadingEmailSetupStatus: false,
        });
      };

      void loadEmailSetupStatus();

      return () => {
        active = false;
      };
    }, [])
  );

  return state;
}
