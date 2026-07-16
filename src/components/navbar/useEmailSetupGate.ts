import {
  getCurrentProfileEmailSetupStatus,
  getCurrentSellerBusinessCategorySetupStatus,
} from "@/src/services/profile.service";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Roles } from "@/src/services/role.service";
import { getCurrentUserRole } from "@/src/services/user.role.service";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";

export type AccountSetupBlockReason = "email" | "seller_categories";

type AccountSetupGateState = {
  isAccountSetupBlocked: boolean;
  isLoadingAccountSetupStatus: boolean;
  blockReason: AccountSetupBlockReason | null;
};

export function normalizeTabPath(path: string) {
  const withoutGroups = path.replace(/\/\([^/]+\)/g, "");
  const withoutIndex = withoutGroups.replace(/\/index$/, "");
  return withoutIndex || "/";
}

export function isAccountSetupAllowedTabPath(path: string) {
  const normalizedPath = normalizeTabPath(path);
  return normalizedPath === "/" || normalizedPath === "/profile";
}

export function isEmailSetupAllowedTabPath(path: string) {
  return isAccountSetupAllowedTabPath(path);
}

export function useAccountSetupGate(): AccountSetupGateState {
  const { state: profileState, activeProfile } = useActiveProfile();
  const [state, setState] = React.useState<AccountSetupGateState>({
    isAccountSetupBlocked: false,
    isLoadingAccountSetupStatus: true,
    blockReason: null,
  });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const loadAccountSetupStatus = async () => {
        if (profileState !== "ready" || !activeProfile) {
          setState({
            isAccountSetupBlocked: false,
            isLoadingAccountSetupStatus: profileState === "loading",
            blockReason: null,
          });
          return;
        }

        setState((current) => ({
          ...current,
          isLoadingAccountSetupStatus: true,
        }));

        const result = await getCurrentProfileEmailSetupStatus();
        if (!active) return;

        if (!result.ok) {
          setState({
            isAccountSetupBlocked: false,
            isLoadingAccountSetupStatus: false,
            blockReason: null,
          });
          return;
        }

        if (!result.data.isComplete) {
          setState({
            isAccountSetupBlocked: true,
            isLoadingAccountSetupStatus: false,
            blockReason: "email",
          });
          return;
        }

        const roleResult = await getCurrentUserRole();
        if (!active) return;

        if (!roleResult.ok || roleResult.data !== Roles.SELLER) {
          setState({
            isAccountSetupBlocked: false,
            isLoadingAccountSetupStatus: false,
            blockReason: null,
          });
          return;
        }

        const categoryResult = await getCurrentSellerBusinessCategorySetupStatus();
        if (!active) return;

        if (!categoryResult.ok) {
          setState({
            isAccountSetupBlocked: false,
            isLoadingAccountSetupStatus: false,
            blockReason: null,
          });
          return;
        }

        setState({
          isAccountSetupBlocked: !categoryResult.data.isComplete,
          isLoadingAccountSetupStatus: false,
          blockReason: categoryResult.data.isComplete ? null : "seller_categories",
        });
      };

      void loadAccountSetupStatus();

      return () => {
        active = false;
      };
    }, [activeProfile, profileState])
  );

  return state;
}

export function useEmailSetupGate(): AccountSetupGateState {
  return useAccountSetupGate();
}
