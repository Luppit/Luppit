import {
  isEmailSetupAllowedAppPath,
  isProfileEmailSetupComplete,
} from "@/src/components/navbar/useEmailSetupGate";
import { Redirect, usePathname } from "expo-router";
import React from "react";
import { useActiveProfile } from "./ActiveProfileContext";

export default function EmailSetupNavigationGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { state, activeProfile } = useActiveProfile();
  const requiresEmailSetup =
    state === "ready" &&
    activeProfile != null &&
    !isProfileEmailSetupComplete(activeProfile.profile);

  if (requiresEmailSetup && !isEmailSetupAllowedAppPath(pathname)) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}
