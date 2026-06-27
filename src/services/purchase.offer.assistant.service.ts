import type { ChatImage } from "../components/inputChat/inputChat";
import { getSession } from "../lib/supabase";
import { AppError, fromAppError } from "../lib/supabase/errors";

const SELLER_OFFER_ASSISTANT_EDGE_FUNCTION = "ai-vendedor-completar";
const MAX_PROMPT_LENGTH = 4000;
const MAX_IMAGES_PER_REQUEST = 6;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export type SellerOfferAssistantUiAction =
  | "SHOW_SUMMARY"
  | "CONTINUE"
  | "PUBLISH";

export type SellerOfferAssistantStatus = "draft" | "ready" | "sent";

export type SellerOfferAssistantInteractionType =
  | "OFFER_BUILD"
  | "OFFER_PUBLISH"
  | string;

export type SellerOfferAssistantControlAction =
  | "NINGUNA"
  | "MOSTRAR_RESUMEN"
  | "SEGUIR_ACLARANDO"
  | "OTRA"
  | string;

export type SellerOfferAssistantSummary = {
  descripcion: string | null;
  precio: number | null;
  moneda: string | null;
  entrega: string | null;
  retiroDespuesDeDias: number | null;
  envioMaximoDias: number | null;
  precioEnvio: number | null;
};

export type SellerOfferAssistantSuccess = {
  ok: true;
  offerDraftId: string | null;
  purchaseOfferId: string | null;
  status: SellerOfferAssistantStatus | null;
  isReadyToSend: boolean;
  missingFields: string[];
  summary: SellerOfferAssistantSummary | null;
  assistantMessage: string | null;
  interactionType: SellerOfferAssistantInteractionType | null;
  controlAction: SellerOfferAssistantControlAction | null;
  requestId: string | null;
};

export type SellerOfferAssistantFailure = {
  ok: false;
  error: AppError;
  statusCode: number | null;
  requestId: string | null;
  retryAfterSeconds: number | null;
  backendMessage: string | null;
};

export type SellerOfferAssistantResult =
  | SellerOfferAssistantSuccess
  | SellerOfferAssistantFailure;

export type SellerOfferAssistantRequestIdentity = {
  clientRequestId: string;
  idempotencyKey: string;
};

export type SellerOfferAssistantRequest = {
  prompt: string;
  conversationId?: string | null;
  offerDraftId?: string | null;
  uiAction?: SellerOfferAssistantUiAction | null;
  images?: ChatImage[];
  identity?: SellerOfferAssistantRequestIdentity;
};

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSummary(value: unknown): SellerOfferAssistantSummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  return {
    descripcion: normalizeString(record.descripcion),
    precio: normalizeNumber(record.precio),
    moneda: normalizeString(record.moneda),
    entrega: normalizeString(record.entrega),
    retiroDespuesDeDias: normalizeNumber(record.retiro_despues_de_dias),
    envioMaximoDias: normalizeNumber(record.envio_maximo_dias),
    precioEnvio: normalizeNumber(record.precio_envio),
  };
}

function getBackendMessage(record: Record<string, unknown>) {
  const error = record.error;
  if (typeof error === "string" && error.trim().length > 0) return error;
  if (error && typeof error === "object") {
    const message = normalizeString((error as Record<string, unknown>).message);
    if (message) return message;
  }

  return (
    normalizeString(record.mensaje_usuario) ??
    normalizeString(record.message) ??
    null
  );
}

function toStatusCodeError(
  statusCode: number | null,
  backendMessage: string | null
): AppError {
  if (statusCode === 400) {
    return {
      type: "validation",
      message: backendMessage ?? "Error de validación, por favor revisa los datos ingresados.",
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      type: "auth",
      message: backendMessage ?? "No tienes permisos para crear esta oferta.",
    };
  }

  if (statusCode === 404) {
    return {
      type: "not_found",
      message: backendMessage ?? "No encontramos la conversación de esta oferta.",
    };
  }

  if (statusCode === 409) {
    return {
      type: "validation",
      message: backendMessage ?? "Esta oferta ya fue enviada o el borrador cambió.",
    };
  }

  if (statusCode === 429) {
    return {
      type: "network",
      message:
        backendMessage ??
        "Demasiadas solicitudes. Intenta nuevamente en unos segundos.",
    };
  }

  if (statusCode === 503) {
    return {
      type: "network",
      message:
        backendMessage ??
        "El asistente no está disponible en este momento. Intenta nuevamente.",
    };
  }

  return {
    type: "unknown",
    message: backendMessage ?? "Ocurrió un error, intenta de nuevo.",
  };
}

function toSuccessPayload(
  payload: Record<string, unknown>,
  requestId: string | null
): SellerOfferAssistantSuccess {
  return {
    ok: true,
    offerDraftId: normalizeString(payload.offer_draft_id),
    purchaseOfferId: normalizeString(payload.purchase_offer_id),
    status: (normalizeString(payload.status) as SellerOfferAssistantStatus | null) ?? null,
    isReadyToSend: payload.listo_para_enviar === true,
    missingFields: normalizeStringArray(payload.faltantes),
    summary: normalizeSummary(payload.resumen),
    assistantMessage: normalizeString(payload.mensaje_usuario),
    interactionType:
      (normalizeString(payload.tipo_interaccion) as SellerOfferAssistantInteractionType | null) ??
      null,
    controlAction:
      (normalizeString(payload.accion_control) as SellerOfferAssistantControlAction | null) ??
      null,
    requestId,
  };
}

function buildFunctionUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, "")}/functions/v1/${SELLER_OFFER_ASSISTANT_EDGE_FUNCTION}`;
}

export function createSellerOfferAssistantRequestIdentity(
  prefix: string
): SellerOfferAssistantRequestIdentity {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48) || "seller-offer";
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  return {
    clientRequestId: `${safePrefix}-${suffix}`.slice(0, 128),
    idempotencyKey: `${safePrefix}-idempotency-${suffix}`.slice(0, 128),
  };
}

function getImageName(image: ChatImage, index: number) {
  if (image.name && image.name.trim().length > 0) return image.name;
  const extension = image.mime?.split("/")[1]?.split(";")[0] ?? "jpg";
  return `offer-image-${index + 1}.${extension}`;
}

function validateInput(input: SellerOfferAssistantRequest): AppError | null {
  if (!input.conversationId && !input.offerDraftId) return fromAppError("validation");
  if ((input.prompt ?? "").length > MAX_PROMPT_LENGTH) {
    return {
      type: "validation",
      message: "El mensaje no puede superar 4000 caracteres.",
    };
  }

  const images = input.images ?? [];
  if (images.length > MAX_IMAGES_PER_REQUEST) {
    return {
      type: "validation",
      message: "Puedes adjuntar máximo 6 fotos por mensaje.",
    };
  }

  const oversizedImage = images.find((image) => (image.size ?? 0) > MAX_IMAGE_BYTES);
  if (oversizedImage) {
    return {
      type: "validation",
      message: "Cada foto debe pesar máximo 3 MB.",
    };
  }

  return null;
}

function buildJsonBody(
  input: SellerOfferAssistantRequest,
  identity: SellerOfferAssistantRequestIdentity
) {
  return JSON.stringify({
    prompt: input.prompt.trim(),
    conversation_id: input.conversationId ?? null,
    offer_draft_id: input.offerDraftId ?? null,
    ui_action: input.uiAction ?? null,
    client_request_id: identity.clientRequestId,
    idempotency_key: identity.idempotencyKey,
  });
}

function buildFormDataBody(
  input: SellerOfferAssistantRequest,
  identity: SellerOfferAssistantRequestIdentity
) {
  const formData = new FormData();
  formData.append("prompt", input.prompt.trim());
  if (input.conversationId) formData.append("conversation_id", input.conversationId);
  if (input.offerDraftId) formData.append("offer_draft_id", input.offerDraftId);
  if (input.uiAction) formData.append("ui_action", input.uiAction);
  formData.append("client_request_id", identity.clientRequestId);
  formData.append("idempotency_key", identity.idempotencyKey);

  (input.images ?? []).forEach((image, index) => {
    formData.append("offer_images", {
      uri: image.uri,
      type: image.mime ?? "image/jpeg",
      name: getImageName(image, index),
    } as any);
  });

  return formData;
}

export async function callSellerOfferAssistant(
  input: SellerOfferAssistantRequest
): Promise<SellerOfferAssistantResult> {
  const validationError = validateInput(input);
  if (validationError) {
    return {
      ok: false,
      error: validationError,
      statusCode: 400,
      requestId: null,
      retryAfterSeconds: null,
      backendMessage: validationError.message,
    };
  }

  const session = await getSession();
  if (!session?.access_token) {
    return {
      ok: false,
      error: fromAppError("auth"),
      statusCode: 401,
      requestId: null,
      retryAfterSeconds: null,
      backendMessage: null,
    };
  }

  const functionUrl = buildFunctionUrl();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!functionUrl || !anonKey) {
    return {
      ok: false,
      error: fromAppError("unknown"),
      statusCode: null,
      requestId: null,
      retryAfterSeconds: null,
      backendMessage: `No se pudo configurar ${SELLER_OFFER_ASSISTANT_EDGE_FUNCTION}.`,
    };
  }

  const identity =
    input.identity ??
    createSellerOfferAssistantRequestIdentity(input.uiAction ?? "seller-offer-message");
  const hasImages = (input.images ?? []).length > 0;

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        ...(hasImages ? {} : { "Content-Type": "application/json" }),
        "Idempotency-Key": identity.idempotencyKey,
        "x-request-id": identity.clientRequestId,
      },
      body: hasImages
        ? buildFormDataBody(input, identity)
        : buildJsonBody(input, identity),
    });

    const requestId = normalizeString(response.headers.get("x-request-id"));
    const retryHeader = response.headers.get("Retry-After");
    const retryAfterSeconds =
      retryHeader && !Number.isNaN(Number(retryHeader)) ? Number(retryHeader) : null;

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const record =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};

    if (!response.ok || record.ok === false) {
      const backendMessage = getBackendMessage(record);
      return {
        ok: false,
        error: toStatusCodeError(response.status, backendMessage),
        statusCode: response.status,
        requestId: requestId ?? normalizeString(record.request_id),
        retryAfterSeconds:
          retryAfterSeconds ??
          (typeof record.retry_after_seconds === "number"
            ? record.retry_after_seconds
            : null),
        backendMessage,
      };
    }

    return toSuccessPayload(
      record,
      requestId ?? normalizeString(record.request_id)
    );
  } catch {
    return {
      ok: false,
      error: fromAppError("network"),
      statusCode: null,
      requestId: null,
      retryAfterSeconds: null,
      backendMessage: null,
    };
  }
}
