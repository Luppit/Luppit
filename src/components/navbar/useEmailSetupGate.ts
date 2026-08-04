import {
  getCurrentSellerBusinessCategorySetupStatus,
} from "@/src/services/profile.service";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { Roles } from "@/src/services/role.service";
import { getCurrentUserRole } from "@/src/services/user.role.service";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";

export type AccountSetupBlockReason = "email" | "seller_categories";

type EmailSetupProfile = {
  email: string | null;
  email_opt_in: boolean;
  email_opt_in_at: string | null;
};

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

export function isProfileEmailSetupComplete(profile: EmailSetupProfile | null | undefined) {
  return Boolean(
    profile?.email?.trim() &&
      profile.email_opt_in === true &&
      profile.email_opt_in_at
  );
}

export function isAccountSetupAllowedTabPath(
  path: string,
  blockReason: AccountSetupBlockReason | null = null
) {
  const normalizedPath = normalizeTabPath(path);
  if (blockReason === "email") return normalizedPath === "/";
  return normalizedPath === "/" || normalizedPath === "/profile";
}

export function isEmailSetupAllowedTabPath(path: string) {
  return isAccountSetupAllowedTabPath(path, "email");
}

export function isEmailSetupAllowedAppPath(path: string) {
  const normalizedPath = normalizeTabPath(path);
  return (
    normalizedPath === "/" ||
    normalizedPath === "/email-setup" ||
    normalizedPath === "/legal-document" ||
    normalizedPath.startsWith("/request/")
  );
}

export function useAccountSetupGate(): AccountSetupGateState {
  const { state: profileState, activeProfile } = useActiveProfile();
  const isEmailSetupIncomplete =
    profileState === "ready" &&
    activeProfile != null &&
    !isProfileEmailSetupComplete(activeProfile.profile);
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

        if (isEmailSetupIncomplete) {
          setState({
            isAccountSetupBlocked: true,
            isLoadingAccountSetupStatus: false,
            blockReason: "email",
          });
          return;
        }

        setState((current) => ({
          ...current,
          isLoadingAccountSetupStatus: true,
        }));

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
    }, [activeProfile, isEmailSetupIncomplete, profileState])
  );

  if (isEmailSetupIncomplete) {
    return {
      isAccountSetupBlocked: true,
      isLoadingAccountSetupStatus: false,
      blockReason: "email",
    };
  }

  return state;
}

export function useEmailSetupGate(): AccountSetupGateState {
  return useAccountSetupGate();
}
