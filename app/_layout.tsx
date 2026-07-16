import GlobalPopupHost from "@/src/components/popup/GlobalPopupHost";
import GlobalToastHost from "@/src/components/toast/GlobalToastHost";
import {
  ActiveProfileBootstrapGate,
  ActiveProfileProvider,
} from "@/src/components/profile/ActiveProfileContext";
import { ThemeProvider } from "@/src/themes/ThemeProvider";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { Slot } from "expo-router";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  return (
    <ThemeProvider>
      <ActiveProfileProvider>
        <ActiveProfileBootstrapGate>
          <Slot />
        </ActiveProfileBootstrapGate>
        {!fontsLoaded && null}
        <GlobalPopupHost />
        <GlobalToastHost />
      </ActiveProfileProvider>
    </ThemeProvider>
  );
}
