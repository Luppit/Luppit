import { Linking } from "react-native";
import { SUPPORT_EMAIL } from "../config/appInfo";
import { showError } from "../utils/useToast";

const SUPPORT_EMAIL_SUBJECT = "Ayuda Luppit";

function buildSupportEmailUrls() {
  const encodedEmail = encodeURIComponent(SUPPORT_EMAIL);
  const encodedSubject = encodeURIComponent(SUPPORT_EMAIL_SUBJECT);

  return [
    `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}`,
    `mailto:${SUPPORT_EMAIL}`,
    `googlegmail://co?to=${encodedEmail}&subject=${encodedSubject}`,
    `ms-outlook://compose?to=${encodedEmail}&subject=${encodedSubject}`,
    `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedEmail}&su=${encodedSubject}`,
  ];
}

export async function openSupportEmail() {
  const urls = buildSupportEmailUrls();

  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Try the next supported email target.
    }
  }

  showError("No se pudo abrir el correo", `Escríbenos a ${SUPPORT_EMAIL}.`);
}
