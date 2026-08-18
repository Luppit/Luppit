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
  const isBusinessVerificationAllowedRoute =
    pathname === "/business-verification" ||
    pathname === "/email-setup" ||
    pathname === "/legal-document" ||
    pathname === "/faq" ||
    pathname === "/notifications" ||
    pathname === "/account-settings";

  if (
    state === "business_verification_required" &&
    !isBusinessVerificationAllowedRoute
  ) {
    return (
      <Redirect
        href={{
          pathname: "/(detail)/business-verification",
          params: { title: "Verificar negocio", hideMenu: "true" },
        }}
      />
    );
  }

  if (
    requiresEmailSetup &&
    !isInitialProfileSetupRoute &&
    !isEmailSetupAllowedAppPath(pathname)
  ) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}
