import {
  callPurchaseRequestAssistant,
  createPurchaseRequestAssistantRequestIdentity,
  PurchaseRequestAssistantRequest,
  PurchaseRequestAssistantCategorySuggestion,
  PurchaseRequestAssistantStatus,
  PurchaseRequestAssistantSummary,
  PurchaseRequestAssistantUiState,
} from "@/src/services/purchase.request.assistant.service";
import type { ChatImage } from "@/src/components/inputChat/inputChat";
import { openPopup } from "@/src/services/popup.service";
import { showError, showWarning } from "@/src/utils/useToast";
import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo } from "react-native";

export type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  images?: ChatImage[];
  failedRequests?: PurchaseRequestAssistantRequest[];
};

type ChatSessionContextValue = {
  messages: ChatMessage[];
  title?: string;
  draftId: string | null;
  status: PurchaseRequestAssistantStatus | null;
  uiState: PurchaseRequestAssistantUiState;
  pendingAction: string | null;
  requiredFields: string[];
  optionalFields: string[];
  missingFields: string[];
  categorySuggestions: PurchaseRequestAssistantCategorySuggestion[];
  summary: PurchaseRequestAssistantSummary | null;
  summaryText: string | null;
  purchaseRequestId: string | null;
  isSendingMessage: boolean;
  isGeneratingSummary: boolean;
  isExecutingControl: boolean;
  canPublish: boolean;
  showComposer: boolean;
  canCompose: boolean;
  sendMessage: (payload: { text: string; images: ChatImage[] }) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  stopAssistant: () => void;
  continueClarifying: () => Promise<void>;
  publishDraft: () => Promise<void>;
};

const ChatSessionContext = createContext<ChatSessionContextValue>({
  messages: [],
  title: undefined,
  draftId: null,
  status: null,
  uiState: "normal",
  pendingAction: null,
  requiredFields: [],
  optionalFields: [],
  missingFields: [],
  categorySuggestions: [],
  summary: null,
  summaryText: null,
  purchaseRequestId: null,
  isSendingMessage: false,
  isGeneratingSummary: false,
  isExecutingControl: false,
  canPublish: false,
  showComposer: true,
  canCompose: true,
  sendMessage: async () => {},
  retryMessage: async () => {},
  stopAssistant: () => {},
  continueClarifying: async () => {},
  publishDraft: async () => {},
});

function createMessageId(prefix: "user" | "assistant") {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function normalizeReply(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function shouldOpenSummaryFromReply(value: string) {
  const normalized = normalizeReply(value);
  if (!normalized) return false;

  return [
    "si",
    "si ok",
    "si, ok",
    "sí",
    "ok",
    "dale",
    "claro",
    "mostrar resumen",
    "ver resumen",
    "muéstrame el resumen",
    "muestrame el resumen",
    "ensename el resumen",
    "enséñame el resumen",
  ].some((option) => normalized === option || normalized.includes(option));
}

const imageOnlyPrompt = "Adjunto imágenes de referencia para mi solicitud.";

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [status, setStatus] = useState<PurchaseRequestAssistantStatus | null>(null);
  const [uiState, setUiState] = useState<PurchaseRequestAssistantUiState>("normal");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [optionalFields, setOptionalFields] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<
    PurchaseRequestAssistantCategorySuggestion[]
  >([]);
  const [summary, setSummary] = useState<PurchaseRequestAssistantSummary | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [purchaseRequestId, setPurchaseRequestId] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isExecutingControl, setIsExecutingControl] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const shownSuccessRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      const activeRequest = activeRequestRef.current;
      activeRequestRef.current = null;
      activeRequest?.abort();
    };
  }, []);

  const stopAssistant = useCallback(() => {
    const activeRequest = activeRequestRef.current;
    if (!activeRequest) return;

    activeRequestRef.current = null;
    activeRequest.abort();
    setIsSendingMessage(false);
    setIsGeneratingSummary(false);
    AccessibilityInfo.announceForAccessibility("Respuesta detenida");
  }, []);

  const syncAssistantState = useCallback(
    async (
      next: Awaited<ReturnType<typeof callPurchaseRequestAssistant>>,
      {
        appendAssistantMessage = true,
      }: { appendAssistantMessage?: boolean } = {}
    ) => {
      if (!next.ok) {
        if (next.error.code === "PROFILE_SCOPED_REQUEST_ABORTED") return;
        if (next.requestId) {
          console.warn("purchase-request-assistant request failed", {
            requestId: next.requestId,
            statusCode: next.statusCode,
          });
        }

        if (next.statusCode === 429 && next.retryAfterSeconds) {
          showWarning(
            "Espera un momento",
            `${next.error.message} Reintenta en ${next.retryAfterSeconds} segundos.`
          );
          return;
        }

        showError("No se pudo continuar", next.error.message);
        return;
      }

      if (next.requestId) {
        console.log("purchase-request-assistant request completed", {
          requestId: next.requestId,
          status: next.status,
          uiState: next.uiState,
        });
      }

      setDraftId(next.draftId);
      setStatus(next.status);
      setUiState(next.uiState ?? (next.status === "published" ? "published" : "normal"));
      setPendingAction(next.pendingAction);
      setRequiredFields(next.requiredFields);
      setOptionalFields(next.optionalFields);
      setMissingFields(next.missingFields);
      setCategorySuggestions(next.categorySuggestions);
      setSummary(next.summary);
      setSummaryText(next.summaryText);
      setPurchaseRequestId(next.purchaseRequestId);

      const assistantMessage = next.assistantMessage;
      if (appendAssistantMessage && assistantMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId("assistant"),
            sender: "assistant",
            text: assistantMessage,
          },
        ]);
      }

      if (next.status === "published" && next.purchaseRequestId) {
        if (shownSuccessRequestIdRef.current === next.purchaseRequestId) return;
        shownSuccessRequestIdRef.current = next.purchaseRequestId;

        const publishedRequestId = next.purchaseRequestId;
        openPopup({
          type: "success",
          title: "¡Solicitud publicada!",
          description:
            "Ya está visible para que los negocios puedan enviarte ofertas.",
          actionLabel: "Ver mi solicitud",
          actionBackgroundColorKey: "textDark",
          onAction: () => {
            router.replace({
              pathname: "/request/[purchaseRequestId]",
              params: { purchaseRequestId: publishedRequestId },
            });
          },
        });
      }
    },
    []
  );

  const executeMessageRequests = useCallback(
    async (messageId: string, requests: PurchaseRequestAssistantRequest[]) => {
      if (activeRequestRef.current) return;

      const requestSequence = ++requestSequenceRef.current;
      const requestController = new AbortController();
      activeRequestRef.current = requestController;
      setIsSendingMessage(true);
      setIsGeneratingSummary(
        requests.some((request) => request.ui_action === "SHOW_SUMMARY")
      );
      try {
        for (let index = 0; index < requests.length; index += 1) {
          const input = requests[index];
          const result = await callPurchaseRequestAssistant({
            ...input,
            signal: requestController.signal,
          });
          if (
            requestController.signal.aborted ||
            activeRequestRef.current !== requestController
          ) {
            if (requestSequenceRef.current === requestSequence) {
              setMessages((current) =>
                current.map((message) =>
                  message.id === messageId
                    ? { ...message, failedRequests: requests.slice(index) }
                    : message
                )
              );
            }
            return;
          }

          await syncAssistantState(result, {
            appendAssistantMessage: input.ui_action !== "CONTINUE",
          });
          if (!result.ok) {
            if (
              result.error.code !== "PROFILE_SCOPED_REQUEST_ABORTED" &&
              requestSequenceRef.current === requestSequence
            ) {
              setMessages((current) =>
                current.map((message) =>
                  message.id === messageId
                    ? { ...message, failedRequests: requests.slice(index) }
                    : message
                )
              );
            }
            return;
          }
        }
        if (requestSequenceRef.current === requestSequence) {
          setMessages((current) =>
            current.map((message) =>
              message.id === messageId
                ? { ...message, failedRequests: undefined }
                : message
            )
          );
        }
      } finally {
        if (activeRequestRef.current === requestController) {
          activeRequestRef.current = null;
          setIsSendingMessage(false);
          setIsGeneratingSummary(false);
        }
      }
    },
    [syncAssistantState]
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (activeRequestRef.current || isSendingMessage || isExecutingControl) return;
      const message = messages.find((candidate) => candidate.id === messageId);
      if (!message?.failedRequests?.length) return;
      await executeMessageRequests(messageId, message.failedRequests);
    },
    [executeMessageRequests, isExecutingControl, isSendingMessage, messages]
  );

  const sendMessage = useCallback(
    async ({ text, images }: { text: string; images: ChatImage[] }) => {
      const trimmed = text.trim();
      if (
        (!trimmed && images.length === 0) ||
        activeRequestRef.current ||
        isSendingMessage ||
        isExecutingControl ||
        status === "published"
      ) {
        return;
      }

      const messageId = createMessageId("user");
      setMessages((prev) => [
        ...prev,
        { id: messageId, sender: "user", text: trimmed, images },
      ]);

      const requests: PurchaseRequestAssistantRequest[] = [];
      if (
        images.length === 0 &&
        status === "ready" &&
        uiState !== "review" &&
        pendingAction === "ASK_SHOW_SUMMARY" &&
        shouldOpenSummaryFromReply(trimmed)
      ) {
        requests.push({
          prompt: "",
          draft_id: draftId,
          ui_action: "SHOW_SUMMARY",
          ...createPurchaseRequestAssistantRequestIdentity("SHOW_SUMMARY"),
        });
        await executeMessageRequests(messageId, requests);
        return;
      }

      if (uiState === "review" && draftId) {
        requests.push({
          prompt: "",
          draft_id: draftId,
          ui_action: "CONTINUE",
          ...createPurchaseRequestAssistantRequestIdentity("CONTINUE"),
        });
      }

      requests.push({
        prompt: trimmed || imageOnlyPrompt,
        draft_id: draftId,
        images,
        ...createPurchaseRequestAssistantRequestIdentity("message"),
      });
      await executeMessageRequests(messageId, requests);
    },
    [
      draftId,
      executeMessageRequests,
      isExecutingControl,
      isSendingMessage,
      pendingAction,
      status,
      uiState,
    ]
  );

  const continueClarifying = useCallback(async () => {
    if (!draftId || isSendingMessage || isExecutingControl || status === "published") {
      return;
    }

    setIsExecutingControl(true);
    try {
      const result = await callPurchaseRequestAssistant({
        prompt: "",
        draft_id: draftId,
        ui_action: "CONTINUE",
      });
      await syncAssistantState(result, { appendAssistantMessage: false });
    } finally {
      setIsExecutingControl(false);
    }
  }, [draftId, isExecutingControl, isSendingMessage, status, syncAssistantState]);

  const publishDraft = useCallback(async () => {
    if (!draftId || isSendingMessage || isExecutingControl || status === "published") {
      return;
    }

    setIsExecutingControl(true);
    try {
      const result = await callPurchaseRequestAssistant({
        prompt: "",
        draft_id: draftId,
        ui_action: "PUBLISH",
      });
      await syncAssistantState(result);
    } finally {
      setIsExecutingControl(false);
    }
  }, [draftId, isExecutingControl, isSendingMessage, status, syncAssistantState]);

  const value = useMemo(
    () => ({
      messages,
      title: "Crear solicitud",
      draftId,
      status,
      uiState,
      pendingAction,
      requiredFields,
      optionalFields,
      missingFields,
      categorySuggestions,
      summary,
      summaryText,
      purchaseRequestId,
      isSendingMessage,
      isGeneratingSummary,
      isExecutingControl,
      canPublish:
        Boolean(draftId) &&
        status === "ready" &&
        uiState === "review" &&
        !isSendingMessage &&
        !isExecutingControl,
      showComposer: status !== "published",
      canCompose:
        !isSendingMessage &&
        !isExecutingControl &&
        status !== "published",
      sendMessage,
      retryMessage,
      stopAssistant,
      continueClarifying,
      publishDraft,
    }),
    [
      categorySuggestions,
      continueClarifying,
      draftId,
      isExecutingControl,
      isGeneratingSummary,
      isSendingMessage,
      messages,
      missingFields,
      optionalFields,
      pendingAction,
      publishDraft,
      purchaseRequestId,
      requiredFields,
      sendMessage,
      retryMessage,
      stopAssistant,
      status,
      summary,
      summaryText,
      uiState,
    ]
  );

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}

export function useChatSession() {
  return useContext(ChatSessionContext);
}
