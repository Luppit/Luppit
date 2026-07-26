import { router } from "expo-router";
import React from "react";

export default function DetailFallbackScreen() {
  React.useEffect(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, []);

  return null;
}
