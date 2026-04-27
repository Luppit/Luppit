import { getSession } from "../lib/supabase";
import { AppError, fromAppError } from "../lib/supabase/errors";

const PURCHASE_REQUEST_ASSISTANT_EDGE_FUNCTION = "ai-completar";

export type PurchaseRequestAssistantUiAction =
  | "SHOW_SUMMARY"
  | "CONTINUE"
  | "PUBLISH";

export type PurchaseRequestAssistantStatus =
  | "draft"
  | "ready"
  | "published";

export type PurchaseRequestAssistantUiState =
  | "normal"
  | "review"
  | "published";

export type PurchaseRequestAssistantInteractionType =
  | "BUILD"
  | "CONTROL"
  | "FAQ_LUPPIT"
  | "OUT_OF_SCOPE";

export type PurchaseRequestAssistantControlAction =
  | "NINGUNA"
  | "MOSTRAR_RESUMEN"
  | "SEGUIR_ACLARANDO"
  | "OTRA";

export type PurchaseRequestAssistantCategorySuggestion = {
  id: string;
  name: string;
  path: string | null;
};

export type PurchaseRequestAssistantSummary = {
  titulo: string | null;
  categoria: string | null;
  marca: string[];
  atributos: Record<string, unknown>;
};

export type PurchaseRequestAssistantSuccess = {
  ok: true;
  draftId: string | null;
  status: PurchaseRequestAssistantStatus | null;
  updatedAt: string | null;
  isReadyToPublish: boolean;
  missingFields: string[];
  requiredFields: string[];
  optionalFields: string[];
  categorySuggestions: PurchaseRequestAssistantCategorySuggestion[];
  assistantMessage: string | null;
  interactionType: PurchaseRequestAssistantInteractionType | null;
  controlAction: PurchaseRequestAssistantControlAction | null;
  uiState: PurchaseRequestAssistantUiState | null;
  pendingAction: string | null;
  purchaseRequestId: string | null;
  summary: PurchaseRequestAssistantSummary | null;
  summaryText: string | null;
  requestId: string | null;
};

export type PurchaseRequestAssistantFailure = {
  ok: false;
  error: AppError;
  statusCode: number | null;
  requestId: string | null;
  retryAfterSeconds: number | null;
  backendMessage: string | null;
};

export type PurchaseRequestAssistantResult =
  | PurchaseRequestAssistantSuccess
  | PurchaseRequestAssistantFailure;

type PurchaseRequestAssistantRequest = {
  prompt: string;
  draft_id?: string | null;
  ui_action?: PurchaseRequestAssistantUiAction | null;
  client_request_id?: string | null;
  idempotency_key?: string | null;
};

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function normalizeCategorySuggestion(
  value: unknown
): PurchaseRequestAssistantCategorySuggestion | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = normalizeString(record.id);
  const name = normalizeString(record.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    path: normalizeString(record.path),
  };
}

function normalizeSummary(value: unknown): PurchaseRequestAssistantSummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  return {
    titulo: normalizeString(record.titulo),
    categoria: normalizeString(record.categoria),
    marca: normalizeStringArray(record.marca),
    atributos:
      record.atributos && typeof record.atributos === "object"
        ? (record.atributos as Record<string, unknown>)
        : {},
  };
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

  if (statusCode === 401) {
    return {
      type: "auth",
      message: backendMessage ?? "Error de autenticación, por favor inicia sesión de nuevo.",
    };
  }

  if (statusCode === 404) {
    return {
      type: "not_found",
      message: backendMessage ?? "No se encontraron resultados.",
    };
  }

  if (statusCode === 409) {
    return {
      type: "validation",
      message: backendMessage ?? "Esta solicitud ya fue enviada con otros datos.",
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

  return {
    type: "unknown",
    message: backendMessage ?? "Ocurrió un error, intenta de nuevo.",
  };
}

function toSuccessPayload(
  payload: Record<string, unknown>,
  requestId: string | null
): PurchaseRequestAssistantSuccess {
  return {
    ok: true,
    draftId: normalizeString(payload.draft_id),
    status: (normalizeString(payload.status) as PurchaseRequestAssistantStatus | null) ?? null,
    updatedAt: normalizeString(payload.updated_at),
    isReadyToPublish: payload.listo_para_publicar === true,
    missingFields: normalizeStringArray(payload.faltantes),
    requiredFields: normalizeStringArray(payload.required_fields),
    optionalFields: normalizeStringArray(payload.optional_fields),
    categorySuggestions: Array.isArray(payload.category_suggestions)
      ? payload.category_suggestions
          .map(normalizeCategorySuggestion)
          .filter(
            (
              item
            ): item is PurchaseRequestAssistantCategorySuggestion => item !== null
          )
      : [],
    assistantMessage: normalizeString(payload.mensaje_usuario),
    interactionType:
      (normalizeString(
        payload.tipo_interaccion
      ) as PurchaseRequestAssistantInteractionType | null) ?? null,
    controlAction:
      (normalizeString(
        payload.accion_control
      ) as PurchaseRequestAssistantControlAction | null) ?? null,
    uiState:
      (normalizeString(payload.ui_state) as PurchaseRequestAssistantUiState | null) ??
      null,
    pendingAction: normalizeString(payload.pending_action),
    purchaseRequestId: normalizeString(payload.purchase_request_id),
    summary: normalizeSummary(payload.resumen),
    summaryText: normalizeString(payload.resumen_texto),
    requestId,
  };
}

function buildFunctionUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl.replace(/\/+$/, "")}/functions/v1/${PURCHASE_REQUEST_ASSISTANT_EDGE_FUNCTION}`;
}

function createRequestIdentity(prefix: string) {
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  return {
    clientRequestId: `${prefix}-${suffix}`,
    idempotencyKey: `${prefix}-idempotency-${suffix}`,
  };
}

export async function callPurchaseRequestAssistant(
  input: PurchaseRequestAssistantRequest
): Promise<PurchaseRequestAssistantResult> {
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
      backendMessage: `No se pudo configurar ${PURCHASE_REQUEST_ASSISTANT_EDGE_FUNCTION}.`,
    };
  }

  const trimmedPrompt = input.prompt.trim();
  const identity = createRequestIdentity(input.ui_action ?? "message");
  const clientRequestId = input.client_request_id ?? identity.clientRequestId;
  const idempotencyKey = input.idempotency_key ?? identity.idempotencyKey;

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        "x-request-id": clientRequestId,
      },
      body: JSON.stringify({
        prompt: trimmedPrompt,
        draft_id: input.draft_id ?? null,
        ui_action: input.ui_action ?? null,
        client_request_id: clientRequestId,
        idempotency_key: idempotencyKey,
      }),
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
      const backendMessage =
        normalizeString(record.error) ?? normalizeString(record.mensaje_usuario);
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
