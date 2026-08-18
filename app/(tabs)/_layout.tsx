import Navbar from "@/src/components/navbar/Navbar";
import TopNavbar from "@/src/components/navbar/TopNavbar";
import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import {
  isAccountSetupAllowedTabPath,
  isProfileEmailSetupComplete,
  useAccountSetupGate,
} from "@/src/components/navbar/useEmailSetupGate";
import { RoleProvider } from "@/src/components/role/RoleContext";
import { colors, spacing } from "@/src/themes";
import { Redirect, Slot, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { consumePendingSharedPurchaseRequest } from "@/src/services/shared.purchase.request.service";

export default function TabsLayout() {
  const pathname = usePathname();
  const { state, activeProfile, revision } = useActiveProfile();
  const isReady = state === "ready";
  const [pendingSharedPurchaseRequestId, setPendingSharedPurchaseRequestId] =
    useState<string | null>(null);
  const [hasLoadedPendingSharedRequest, setHasLoadedPendingSharedRequest] =
    useState(false);
  const {
    isAccountSetupBlocked,
    isLoadingAccountSetupStatus,
    blockReason,
  } = useAccountSetupGate();
  const isEmailSetupIncomplete =
    isReady &&
    activeProfile != null &&
    !isProfileEmailSetupComplete(activeProfile.profile);
  const isOffersTabScreen = pathname === "/offers" || pathname === "/ofertas";
  const isFavoritesTabScreen = pathname === "/favorites";
  const isChatsTabScreen = pathname === "/chats";
  const hidesTopNavbar =
    isOffersTabScreen || isFavoritesTabScreen || isChatsTabScreen || pathname === "/profile";

  useEffect(() => {
    let active = true;

    const loadPendingSharedRequest = async () => {
      if (!isReady || isEmailSetupIncomplete) {
        setPendingSharedPurchaseRequestId(null);
        setHasLoadedPendingSharedRequest(true);
        return;
      }

      const purchaseRequestId = await consumePendingSharedPurchaseRequest();
      if (!active) return;
      setPendingSharedPurchaseRequestId(purchaseRequestId);
      setHasLoadedPendingSharedRequest(true);
    };

    setHasLoadedPendingSharedRequest(false);
    void loadPendingSharedRequest();
    return () => {
      active = false;
    };
  }, [isEmailSetupIncomplete, isReady]);

  if (state === "loading") return null;

  if (state === "signed_out") return <Redirect href="/(auth)/auth" />;

  if (state === "identity_required") {
    return <Redirect href="/(auth)/identity-verification" />;
  }

  if (state === "business_verification_required") {
    return (
      <Redirect
        href={{
          pathname: "/(detail)/business-verification",
          params: { title: "Verificar negocio", hideMenu: "true" },
        }}
      />
    );
  }

  if (state === "no_profile" || state === "setup_required") {
    return (
      <Redirect
        href={{
          pathname: "/(detail)/create-profile",
          params: {
            setup: "true",
            title: state === "setup_required" ? "Completar perfil" : "Crear perfil",
            hideMenu: "true",
          },
        }}
      />
    );
  }

  if (!hasLoadedPendingSharedRequest) return null;

  if (pendingSharedPurchaseRequestId) {
    return (
      <Redirect
        href={{
          pathname: "/request/[purchaseRequestId]",
          params: { purchaseRequestId: pendingSharedPurchaseRequestId },
        }}
      />
    );
  }

  if (
    !isLoadingAccountSetupStatus &&
    isAccountSetupBlocked &&
    !isAccountSetupAllowedTabPath(pathname, blockReason)
  ) {
    return <Redirect href="/" />;
  }

  return (
    <View
      key={activeProfile?.profile.id + ":" + revision}
      style={layoutStyles.root}
    >
      <RoleProvider>
        <SafeAreaView style={layoutStyles.view}>
          <View style={layoutStyles.container}>
            <Slot />
          </View>
        </SafeAreaView>
        {hidesTopNavbar ? null : <TopNavbar />}
      </RoleProvider>
      <Navbar />
    </View>
  );
}

const layoutStyles = {
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  view: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
};
