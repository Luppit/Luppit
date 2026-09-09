import { hasOpenPopup } from "@/src/services/popup.service";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useRef } from "react";
import { BackHandler, Keyboard, Platform } from "react-native";

type BackAction = { run: () => void; priority: number };
const actions = new Set<BackAction>();
let subscription: ReturnType<typeof BackHandler.addEventListener> | null = null;

export function goBackOrHome() {
  if (Platform.OS === "android" && !router.canGoBack()) {
    router.replace("/(tabs)");
    return;
  }
  router.back();
}

function handleBack() {
  if (hasOpenPopup()) return true;
  if (Keyboard.isVisible()) {
    Keyboard.dismiss();
    return true;
  }

  let active: BackAction | undefined;
  for (const action of actions) {
    if (!active || action.priority >= active.priority) active = action;
  }
  if (!active) return false;
  active.run();
  return true;
}

export function useAndroidBackAction(
  onBack: () => void,
  { enabled = true, priority = 0 }: { enabled?: boolean; priority?: number } = {}
) {
  const callback = useRef(onBack);
  callback.current = onBack;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android" || !enabled) return;
      const action = { run: () => callback.current(), priority };
      actions.add(action);
      subscription ??= BackHandler.addEventListener("hardwareBackPress", handleBack);

      return () => {
        actions.delete(action);
        if (actions.size === 0) {
          subscription?.remove();
          subscription = null;
        }
      };
    }, [enabled, priority])
  );
}
