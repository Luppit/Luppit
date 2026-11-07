import {
  isEmailSetupAllowedAppPath,
  isProfileEmailSetupComplete,
} from "@/src/components/navbar/useEmailSetupGate";
import { Redirect, useLocalSearchParams, usePathname, useSegments } from "expo-router";
import React from "react";
import { useActiveProfile } from "./ActiveProfileContext";

export default function EmailSetupNavigationGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segments = useSegments();
  const params = useLocalSearchParams<{ setup?: string }>();
  const { state, activeProfile } = useActiveProfile();
  const requiresEmailSetup =
    state === "ready" &&
    activeProfile != null &&
    !isProfileEmailSetupComplete(activeProfile.profile);

  const isInitialProfileSetupRoute =
    pathname === "/create-profile" && params.setup === "true";
  const isBuyerDraftRoute = activeProfile?.role === "buyer" &&
    pathname === "/chat" && segments[0] === "(chat)";
  const isPendingBusinessSetupRoute =
    activeProfile?.businessVerificationStatus === "PENDING" &&
    activeProfile.role === "seller" &&
    ["/business-categories", "/business-location-edit", "/profile-picture-edit"].includes(pathname);
  const isBusinessVerificationAllowedRoute =
    pathname === "/business-verification" ||
    pathname === "/email-setup" ||
    pathname === "/legal-document" ||
    pathname === "/faq" ||
    pathname === "/notifications" ||
    pathname === "/account-settings" ||
    isPendingBusinessSetupRoute;

  if (
    state === "location_unavailable" &&
    !["/location-unavailable", "/business-location-edit", "/legal-document", "/faq", "/account-settings"].includes(pathname)
  ) {
    return <Redirect href={{ pathname: "/(detail)/location-unavailable", params: { title: "Disponibilidad", hideMenu: "true" } }} />;
  }

  if (
    state === "business_verification_required" &&
    !isBusinessVerificationAllowedRoute
  ) {
    return (
      <Redirect
        href={{
          pathname: "/(detail)/business-verification",
          params: { title: "Verificación del negocio", hideMenu: "true" },
        }}
      />
    );
  }

  if (
    requiresEmailSetup &&
    !isInitialProfileSetupRoute &&
    !isBuyerDraftRoute &&
    !isEmailSetupAllowedAppPath(pathname)
  ) {
    return <Redirect href="/" />;
  }

  return <>{children}</>;
}
