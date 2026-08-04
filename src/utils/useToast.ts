import { showToast } from "@/src/services/toast.service";

export function showSuccess(message?: string, description?: string) {
  showToast({
    variant: "success",
    title: message || "Éxito",
    description,
  });
}

export function showError(message?: string, description?: string) {
  showToast({
    variant: "error",
    title: message || "Error",
    description,
  });
}

export function showMissingFields(fields: string[]) {
  const missingFields = fields.map((field) => field.trim()).filter(Boolean);
  if (missingFields.length === 0) return;

  showError("Faltan datos", `Completa: ${missingFields.join(", ")}.`);
}

export function showInfo(message?: string, description?: string) {
  showToast({
    variant: "info",
    title: message || "Información",
    description,
  });
}

export function showWarning(message?: string, description?: string) {
  showToast({
    variant: "warning",
    title: message || "Advertencia",
    description,
  });
}
