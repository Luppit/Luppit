import type { BusinessVerification } from "./business-verification.service.ts";

export function getBusinessVerificationRefreshMessage(
  previous: BusinessVerification | null,
  current: BusinessVerification,
): string {
  if (!previous) return "Consultamos el estado de tu solicitud";

  if (previous.status !== current.status) {
    return current.status === "APPROVED"
      ? "Tu negocio fue aprobado"
      : "Actualizamos el estado de tu solicitud";
  }

  if (
    previous.applicationId !== current.applicationId ||
    previous.submissionVersion !== current.submissionVersion ||
    previous.safeMessage !== current.safeMessage ||
    previous.rnpNumber !== current.rnpNumber
  ) {
    return "Actualizamos la información de tu solicitud";
  }

  return "No hay cambios en tu solicitud";
}
