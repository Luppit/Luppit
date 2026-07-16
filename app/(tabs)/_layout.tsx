import Navbar from "@/src/components/navbar/Navbar";
import TopNavbar from "@/src/components/navbar/TopNavbar";
import {
  isAccountSetupAllowedTabPath,
  useAccountSetupGate,
} from "@/src/components/navbar/useEmailSetupGate";
import { RoleProvider } from "@/src/components/role/RoleContext";
import { colors, spacing } from "@/src/themes";
import { Redirect, Slot, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSession, onAuthChange } from "@/src/lib/supabase";
import { getPendingProfileSwitch } from "@/src/services/profile.switch.service";
import { consumePendingSharedPurchaseRequest } from "@/src/services/shared.purchase.request.service";

export default function TabsLayout() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [isAuth, setAuth] = useState(false);
  const [pendingSharedPurchaseRequestId, setPendingSharedPurchaseRequestId] =
    useState<string | null>(null);
  const [hasLoadedPendingSharedRequest, setHasLoadedPendingSharedRequest] =
    useState(false);
  const { isAccountSetupBlocked, isLoadingAccountSetupStatus } = useAccountSetupGate();
  const isOffersTabScreen = pathname === "/offers" || pathname === "/ofertas";
  const isFavoritesTabScreen = pathname === "/favorites";
  const isChatsTabScreen = pathname === "/chats";
  const hidesTopNavbar =
    isOffersTabScreen || isFavoritesTabScreen || isChatsTabScreen || pathname === "/profile";

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      const session = await getSession();
      setAuth(!!session);
      setReady(true);

      unsub = onAuthChange((_event, hasSession) => {
        setAuth(hasSession);
      });
    })();

    return () => unsub();
  }, []);

  useEffect(() => {
    let active = true;

    const loadPendingSharedRequest = async () => {
      if (!isAuth) {
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
  }, [isAuth]);

  if (!ready) return null;

  if (!isAuth) {
    const pendingProfileSwitch = getPendingProfileSwitch();
    if (pendingProfileSwitch) {
      return (
        <Redirect
          href={{
            pathname: "/(auth)/login",
            params: {
              phone: pendingProfileSwitch.phone,
              autoSendOtp: "true",
            },
          }}
        />
      );
    }

    return <Redirect href="/(auth)/auth" />;
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
    !isAccountSetupAllowedTabPath(pathname)
  ) {
    return <Redirect href="/" />;
  }

  return (
    <View style={layoutStyles.root}>
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
