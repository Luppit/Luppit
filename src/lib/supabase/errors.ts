export type AppErrorType = "network" | "auth" | "validation" | "not_found" | "unknown";

export type AppError = {
  type: AppErrorType;
  message: string; 
  code?: string; 
};

export function fromSupabaseError(error: any): AppError {
  if (!error) {
    return { type: "unknown", message: "Error desconocido" };
  }

  if (error.code === "PGRST116") {
    return { type: "not_found", message: "No se encontraron resultados", code: error.code };
  }

  return {
    type: "unknown",
    message: "Ocurrió un error, intenta de nuevo.",
    code: error.code,
  };
}

export function fromAppError(errorType : AppErrorType): AppError {
  switch (errorType) {
    case "network":
      return { type: "network", message: "Error de red, por favor verifica tu conexión." };
    case "auth":
      return { type: "auth", message: "Error de autenticación, por favor inicia sesión de nuevo." };
    case "validation":
      return { type: "validation", message: "Error de validación, por favor revisa los datos ingresados." };
    case "not_found":
      return { type: "not_found", message: "No se encontraron resultados." };
    default:
      return { type: "unknown", message: "Ocurrió un error, intenta de nuevo." };
  }
}