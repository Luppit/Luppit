import GlobalPopupHost from "@/src/components/popup/GlobalPopupHost";
import GlobalToastHost from "@/src/components/toast/GlobalToastHost";
import LegalAcceptanceGate from "@/src/components/legal/LegalAcceptanceGate";
import EmailSetupNavigationGate from "@/src/components/profile/EmailSetupNavigationGate";
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
import * as Sentry from "@sentry/react-native";
import { Slot } from "expo-router";

Sentry.init({
  enabled: process.env.EXPO_PUBLIC_SENTRY_ENABLED === "true",
  environment:
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ??
    (__DEV__ ? "development" : "production"),
  dsn:
    "https://638dfd22504e0493842e358218d8b4d8@o4511810938142720.ingest.us.sentry.io/4511814081642496",

  // Prevent user identity and other default PII from being attached to events.
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: false,
  enableAutoSessionTracking: false,

  enableLogs: false,
  tracesSampleRate: 0,
  profilesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  attachScreenshot: false,
  attachViewHierarchy: false,
  maxBreadcrumbs: 0,
  beforeSend(event) {
    event.user = undefined;
    event.request = undefined;
    event.extra = undefined;

    return event;
  },
});

Sentry.setUser(null);

function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  return (
    <ThemeProvider>
      <ActiveProfileProvider>
        <ActiveProfileBootstrapGate>
          <LegalAcceptanceGate>
            <EmailSetupNavigationGate>
              <Slot />
            </EmailSetupNavigationGate>
          </LegalAcceptanceGate>
        </ActiveProfileBootstrapGate>
        {!fontsLoaded && null}
        <GlobalPopupHost />
        <GlobalToastHost />
      </ActiveProfileProvider>
    </ThemeProvider>
  );
}

export default Sentry.wrap(
  Sentry.withErrorBoundary(RootLayout, { handled: false }),
);
