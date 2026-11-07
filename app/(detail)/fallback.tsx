import { router } from "expo-router";
import { getSignupLegalReviewState } from "@/src/components/legal/signupLegalReview";
import React from "react";

export default function DetailFallbackScreen() {
  React.useEffect(() => {
    if (getSignupLegalReviewState()) {
      router.dismissTo("/(auth)/signup");
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }, []);

  return null;
}
