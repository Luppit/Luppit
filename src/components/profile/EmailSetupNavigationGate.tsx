import {
  isEmailSetupAllowedAppPath,
  isProfileEmailSetupComplete,
} from "@/src/components/navbar/useEmailSetupGate";
import { Redirect, useLocalSearchParams, usePathname } from "expo-router";
import React from "react";
import { useActiveProfile } from "./ActiveProfileContext";

export default function EmailSetupNavigationGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ setup?: string }>();
  const { state, activeProfile } = useActiveProfile();
  const requiresEmailSetup =
    state === "ready" &&
    activeProfile != null &&
    !isProfileEmailSetupComplete(activeProfile.profile);

  const isInitialProfileSetupRoute =
    pathname === "/create-profile" && params.setup === "true";

  if (
    requiresEmailSetup &&
    !isInitialProfileSetupRoute &&
    !isEmailSetupAllowedAppPath(pathname)
  ) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}
