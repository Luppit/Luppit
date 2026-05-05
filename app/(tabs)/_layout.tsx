import Navbar from "@/src/components/navbar/Navbar";
import TopNavbar from "@/src/components/navbar/TopNavbar";
import { RoleProvider } from "@/src/components/role/RoleContext";
import { colors, spacing } from "@/src/themes";
import { Redirect, Slot, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSession, onAuthChange } from "@/src/lib/supabase";

export default function TabsLayout() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [isAuth, setAuth] = useState(false);
  const isOffersTabScreen = pathname === "/offers" || pathname === "/ofertas";
  const isFavoritesTabScreen = pathname === "/favorites";
  const hidesTopNavbar = isOffersTabScreen || isFavoritesTabScreen || pathname === "/profile";

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

  if (!ready) return null;

  if (!isAuth) return <Redirect href="/(auth)/auth" />;

  return (
    <SafeAreaView style={{ ...layoutStyles.container, ...layoutStyles.view }}>
      <RoleProvider>
        {hidesTopNavbar ? null : <TopNavbar />}
        <View style={layoutStyles.container}>
          <Slot />
        </View>
      </RoleProvider>
      <Navbar />
    </SafeAreaView>
  );
}

const layoutStyles = {
  container: {
    flex: 1,
  },
  view: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
};
