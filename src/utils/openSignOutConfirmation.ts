import { signOut } from "@/src/lib/supabase";
import { openPopup } from "@/src/services/popup.service";
import { showError } from "@/src/utils/useToast";

export function openSignOutConfirmation() {
  openPopup({
    type: "summary",
    title: "Cerrar sesión",
    icon: "log-out",
    description: "Saldrás de esta cuenta en este dispositivo.",
    dismissOnBackdropPress: true,
    actions: [
      {
        id: "stay-signed-in",
        label: "Volver",
        icon: "arrow-left",
        backgroundColorKey: "backgroudWhite",
        textColorKey: "textDark",
        iconColorKey: "textDark",
      },
      {
        id: "confirm-sign-out",
        label: "Cerrar sesión",
        icon: "log-out",
        backgroundColorKey: "backgroudWhite",
        textColorKey: "error",
        iconColorKey: "error",
        onPress: async () => {
          try {
            await signOut();
            return true;
          } catch (error) {
            showError(
              "No se pudo cerrar sesión",
              error instanceof Error ? error.message : undefined
            );
            return false;
          }
        },
      },
    ],
  });
}
