import { Linking } from "react-native";
import { showError } from "../utils/useToast";
import { APP_CONFIG_KEYS, getAppConfigValue } from "./app.config.service";

const SUPPORT_EMAIL_SUBJECT = "Ayuda Luppit";

function buildSupportEmailUrls(supportEmail: string) {
  const encodedEmail = encodeURIComponent(supportEmail);
  const encodedSubject = encodeURIComponent(SUPPORT_EMAIL_SUBJECT);

  return [
    `mailto:${supportEmail}?subject=${encodedSubject}`,
    `mailto:${supportEmail}`,
    `googlegmail://co?to=${encodedEmail}&subject=${encodedSubject}`,
    `ms-outlook://compose?to=${encodedEmail}&subject=${encodedSubject}`,
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedEmail}&su=${encodedSubject}`,
  ];
}

export function getSupportEmail() {
  return getAppConfigValue(APP_CONFIG_KEYS.supportEmail);
}

export async function openSupportEmail(supportEmail: string) {
  const urls = buildSupportEmailUrls(supportEmail);

  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Try the next supported email target.
    }
  }

  showError("No se pudo abrir el correo", `Escríbenos a ${supportEmail}.`);
}
