export type AppErrorType = "network" | "auth" | "validation" | "not_found" | "unknown";

export type AppError = {
  type: AppErrorType;
  message: string; 
  code?: string; 
};

const SAFE_SUPABASE_ERROR_MESSAGES: Record<string, { type: AppErrorType; message: string }> = {
  transaction_code_expired: {
    type: "validation",
    message: "El código venció. Pídele al comprador que genere uno nuevo.",
  },
  transaction_code_expired_new_code_sent: {
    type: "validation",
    message:
      "El código venció. Enviamos uno nuevo al comprador; solicítalo e inténtalo de nuevo.",
  },
  transaction_code_not_found: {
    type: "validation",
    message: "No hay un código activo. Pídele al comprador que genere uno nuevo.",
  },
  transaction_code_not_found_new_code_sent: {
    type: "validation",
    message:
      "No había un código activo. Enviamos uno nuevo al comprador; solicítalo e inténtalo de nuevo.",
  },
  transaction_code_not_configured: {
    type: "validation",
    message: "No encontramos un código activo para esta transacción.",
  },
  transaction_code_already_used: {
    type: "validation",
    message: "Este código ya fue utilizado.",
  },
  transaction_code_invalidated: {
    type: "validation",
    message: "Este código ya no es válido. Solicita el código más reciente al comprador.",
  },
  transaction_code_attempts_exceeded: {
    type: "validation",
    message:
      "El código fue bloqueado después de varios intentos. Espera un momento antes de solicitar otro.",
  },
  transaction_code_rate_limited: {
    type: "validation",
    message:
      "Se solicitaron demasiados códigos recientemente. Inténtalo de nuevo más tarde.",
  },
  transaction_code_resend_too_soon: {
    type: "validation",
    message: "Ya enviamos un código recientemente. Espera un minuto e inténtalo de nuevo.",
  },
  invalid_transaction_code: {
    type: "validation",
    message: "El código no es válido. Revísalo con el comprador e inténtalo de nuevo.",
  },
  invalid_transaction_code_format: {
    type: "validation",
    message: "Ingresa el código de 4 dígitos proporcionado por el comprador.",
  },
  otp_required: {
    type: "validation",
    message: "Ingresa el código proporcionado por el comprador.",
  },
  pickup_not_available_yet: {
    type: "validation",
    message: "El retiro todavía no está disponible. Revisa la fecha indicada en el chat.",
  },
  transaction_code_delivery_unavailable: {
    type: "validation",
    message:
      "No pudimos enviar el código. Verifica que tu correo esté configurado y verificado.",
  },
  otp_delivery_not_configured: {
    type: "validation",
    message: "El envío de códigos no está disponible en este momento.",
  },
  fulfillment_selection_required: {
    type: "validation",
    message:
      "Esta oferta tiene envío y retiro. Debe definirse el método elegido antes de continuar.",
  },
  invalid_fulfillment_selection: {
    type: "validation",
    message: "El método seleccionado ya no está disponible para esta oferta.",
  },
  fulfillment_selection_locked: {
    type: "validation",
    message:
      "El método de entrega ya fue acordado y no puede cambiarse en esta conversación.",
  },
  selected_fulfillment_locked: {
    type: "validation",
    message: "El método acordado no puede eliminarse de una oferta aceptada.",
  },
  pickup_email_setup_required: {
    type: "validation",
    message:
      "Configura y verifica tu correo para recibir el código de retiro.",
  },
  offer_changed: {
    type: "validation",
    message: "La oferta cambió. Revísala nuevamente antes de concretar la compra.",
  },
  delivery_method_not_configured: {
    type: "validation",
    message: "Esta oferta no tiene un método de entrega disponible.",
  },
  delivery_method_not_selected_pickup: {
    type: "validation",
    message: "Esta transacción no usa retiro en tienda.",
  },
  delivery_catalog_kind_mismatch: {
    type: "validation",
    message: "El método de entrega seleccionado no corresponde al tipo de entrega.",
  },
  purchase_request_not_active: {
    type: "validation",
    message: "Esta solicitud ya no está activa para recibir nuevas ofertas.",
  },
  purchase_request_cancellation_locked: {
    type: "validation",
    message:
      "El vendedor ya concretó esta compra. La solicitud ya no se puede cancelar ni eliminar.",
  },
  purchase_request_not_canceled: {
    type: "validation",
    message: "Solo puedes eliminar permanentemente una solicitud cancelada.",
  },
  purchase_request_not_found: {
    type: "not_found",
    message: "Esta solicitud ya no está disponible.",
  },
  purchase_request_not_owned: {
    type: "auth",
    message: "No tienes permiso para modificar esta solicitud.",
  },
  profile_not_owned: {
    type: "auth",
    message: "No tienes permiso para eliminar esta solicitud.",
  },
  storage_cleanup_failed: {
    type: "unknown",
    message:
      "No pudimos eliminar todos los archivos. La solicitud se conservó y puedes intentarlo de nuevo.",
  },
  storage_deletion_failed: {
    type: "unknown",
    message:
      "No pudimos eliminar todos los archivos. La solicitud se conservó y puedes intentarlo de nuevo.",
  },
  rating_already_submitted: {
    type: "validation",
    message: "Ya enviaste una calificación para esta transacción.",
  },
  rating_action_not_available: {
    type: "validation",
    message: "La calificación todavía no está disponible para esta transacción.",
  },
  invalid_transition: {
    type: "validation",
    message: "La conversación cambió de estado. Actualízala e intenta nuevamente.",
  },
  invalid_transition_for_current_status: {
    type: "validation",
    message: "La conversación cambió de estado. Actualízala e intenta nuevamente.",
  },
  profile_not_allowed: {
    type: "auth",
    message: "No tienes permiso para ejecutar esta acción.",
  },
  business_owner_required: {
    type: "auth",
    message: "Solo la persona propietaria puede cambiar la información del negocio.",
  },
  phone_required: {
    type: "validation",
    message: "Ingresa un número de teléfono.",
  },
  luppit_login_not_found: {
    type: "not_found",
    message: "No encontramos una cuenta de Luppit con ese número.",
  },
  cannot_invite_self: {
    type: "validation",
    message: "No puedes invitar tu propio número.",
  },
  business_membership_already_exists: {
    type: "validation",
    message: "Esta persona ya pertenece a tu negocio.",
  },
  invitation_not_available: {
    type: "not_found",
    message: "Esta invitación ya no está disponible.",
  },
  business_member_not_found: {
    type: "not_found",
    message: "Esta persona ya no pertenece al negocio.",
  },
  business_owner_cannot_be_removed: {
    type: "validation",
    message: "La persona propietaria no puede quitarse del equipo.",
  },
  business_member_has_conversation_history: {
    type: "validation",
    message: "Esta persona tiene conversaciones vinculadas al negocio.",
  },
  seller_business_required: {
    type: "auth",
    message: "Este perfil vendedor ya no tiene acceso a un negocio.",
  },
  notification_input_required: {
    type: "validation",
    message: "No pudimos identificar la notificación.",
  },
  notification_not_found: {
    type: "not_found",
    message: "Esta notificación ya no está disponible.",
  },
};

function toErrorRecord(error: unknown): Record<string, unknown> | null {
  return error && typeof error === "object"
    ? (error as Record<string, unknown>)
    : null;
}

function getSafeSupabaseError(error: unknown) {
  const value = toErrorRecord(error);
  const candidates = [value?.error_code, value?.message, value?.code];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = candidate.trim().toLowerCase();
    const safeError = SAFE_SUPABASE_ERROR_MESSAGES[normalized];
    if (safeError) return { ...safeError, code: normalized };
  }

  return null;
}

export function fromSupabaseError(error: unknown): AppError {
  if (!error) {
    return { type: "unknown", message: "Error desconocido" };
  }

  const safeError = getSafeSupabaseError(error);
  if (safeError) return safeError;

  const value = toErrorRecord(error);
  const code = typeof value?.code === "string" ? value.code : undefined;

  if (code === "PGRST116") {
    return { type: "not_found", message: "No se encontraron resultados", code };
  }

  return {
    type: "unknown",
    message: "Ocurrió un error, intenta de nuevo.",
    code,
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
