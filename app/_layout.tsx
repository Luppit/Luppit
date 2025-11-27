import { ThemeProvider } from "@/src/themes/ThemeProvider";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { Slot } from "expo-router";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  return (
    <ThemeProvider>
      <Slot />
      {!fontsLoaded && null}
      <Toast />
    </ThemeProvider>
  );
}
