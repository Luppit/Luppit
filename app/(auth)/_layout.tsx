import { useActiveProfile } from "@/src/components/profile/ActiveProfileContext";
import { colors, spacing } from "@/src/themes";
import { Redirect, Slot, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthLayout() {
  const { state } = useActiveProfile();
  const pathname = usePathname();

  if (state === "ready" && pathname !== "/identity-verification") {
    return <Redirect href="/(tabs)" />;
  }
  if (state === "identity_required" && pathname !== "/identity-verification") {
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
            title:
              state === "setup_required"
                ? "Completar perfil"
                : "Completar registro",
            hideMenu: "true",
          },
        }}
      />
    );
  }

  return (
    <SafeAreaView style={authLayoutStyles.container}>
      <View style={authLayoutStyles.viewStyles}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

const authLayoutStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  viewStyles: {
    flex: 1,
    marginTop: spacing.xl,
  },
});
