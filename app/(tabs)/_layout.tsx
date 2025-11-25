import Navbar from "@/src/components/navbar/Navbar";
import { colors, spacing } from "@/src/themes";
import { Redirect, Slot } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getSession, onAuthChange } from "@/src/lib/supabase";

export default function TabsLayout() {
  const [ready, setReady] = useState(false);
  const [isAuth, setAuth] = useState(false);

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
      <View style={layoutStyles.container}>
        <Slot />
      </View>
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