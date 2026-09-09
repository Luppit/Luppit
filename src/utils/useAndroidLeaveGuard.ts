import { hasOpenPopup, openPopup } from "@/src/services/popup.service";
import { useIsFocused, useNavigation, usePreventRemove } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";

type NavigationRequest = {
  navigate: () => void | Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export function useAndroidLeaveGuard(hasChanges: boolean, busy = false) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [exitRequest, setExitRequest] = useState<NavigationRequest | null>(null);
  const handledRequest = useRef<NavigationRequest | null>(null);

  usePreventRemove(
    Platform.OS === "android" && isFocused && !exitRequest && (hasChanges || busy),
    ({ data }) => {
      if (busy || hasOpenPopup()) return;
      Keyboard.dismiss();
      openPopup({
        type: "summary",
        title: "¿Salir sin guardar?",
        description: "Los cambios que no hayas guardado se perderán.",
        androidBackActionId: "keep-editing",
        actions: [
          { id: "keep-editing", label: "Volver", icon: "arrow-left" },
          {
            id: "leave-editor",
            label: "Salir",
            textColorKey: "error",
            onPress: () => {
              if (navigation.isFocused()) navigation.dispatch(data.action);
            },
          },
        ],
      });
    }
  );

  useEffect(() => {
    if (!exitRequest || handledRequest.current === exitRequest) return;
    handledRequest.current = exitRequest;
    void Promise.resolve().then(exitRequest.navigate).then(exitRequest.resolve, (error) => {
      setExitRequest((current) => current === exitRequest ? null : current);
      exitRequest.reject(error);
    });
  }, [exitRequest]);

  return useCallback(async (navigate: () => void | Promise<void>) => {
    if (Platform.OS !== "android") {
      await navigate();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      setExitRequest({ navigate, resolve, reject });
    });
  }, []);
}
