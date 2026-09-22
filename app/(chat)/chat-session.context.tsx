import {
  isAssistantReviewInstruction,
  shouldOpenAssistantSummary,
} from "../../src/utils/assistantSummaryReply";
import { isPurchaseRequestReadyToPublish } from "../../src/utils/purchaseRequestReadiness";
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
  isRestoring: boolean;
  sessionError: string | null;
  restoreDraft: () => Promise<void>;
  discardDraft: () => Promise<boolean>;
  draftResetKey: number;
  isSendingMessage: boolean;
  isGeneratingSummary: boolean;
  isExecutingControl: boolean;
  isReadyToPublish: boolean;
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
  isRestoring: true,
  sessionError: null,
  restoreDraft: async () => {},
  discardDraft: async () => false,
  draftResetKey: 0,
  isSendingMessage: false,
  isGeneratingSummary: false,
  isExecutingControl: false,
  isReadyToPublish: false,
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

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [isRestoring, setIsRestoring] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionReadyRef = useRef(false);
  const pendingControlRef = useRef<PurchaseRequestAssistantRequest | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const currentDraftIdRef = useRef<string | null>(null);
  const [draftResetKey, setDraftResetKey] = useState(0);
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
  const [isReadyToPublish, setIsReadyToPublish] = useState(false);
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const shownSuccessRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      currentDraftIdRef.current = null;
      const activeRequest = activeRequestRef.current;
      activeRequestRef.current = null;
      activeRequest?.abort();
      requestSequenceRef.current += 1;
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
        if (next.error.code === "REQUEST_DRAFT_UNAVAILABLE") {
          sessionReadyRef.current = false;
          setSessionError(next.error.message);
        }
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

      if (next.draftId) {
        currentDraftIdRef.current = next.draftId;
        setDraftId(next.draftId);
      }
      if (next.status === "published" || next.status === "cancelled") currentDraftIdRef.current = null;
      setStatus(next.status);
      setIsReadyToPublish(isPurchaseRequestReadyToPublish(next));
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
      if (
        appendAssistantMessage &&
        assistantMessage &&
        !(next.uiState === "review" && isAssistantReviewInstruction(assistantMessage))
      ) {
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

  const restoreDraft = useCallback(async () => {
    if (activeRequestRef.current) return;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    sessionReadyRef.current = false;
    requestSequenceRef.current += 1;
    setIsRestoring(true);
    setSessionError(null);
    try {
      const result = await callPurchaseRequestAssistant({
        prompt: "", ui_action: "RESTORE", signal: controller.signal,
        ...createPurchaseRequestAssistantRequestIdentity("RESTORE"),
      });
      if (controller.signal.aborted || activeRequestRef.current !== controller) return;
      if (!result.ok) {
        if (result.recoverableDraftId) {
          currentDraftIdRef.current = result.recoverableDraftId;
          setDraftId(result.recoverableDraftId);
        }
        setSessionError(result.error.message);
        return;
      }
      currentDraftIdRef.current = result.draftId;
      setDraftId(result.draftId);
      setMessages(result.messages.filter((message) =>
        !(message.role === "assistant" && result.uiState === "review" && isAssistantReviewInstruction(message.content))
      ).map((message) => ({
        id: message.id, sender: message.role, text: message.content,
        images: message.imageUrls.map((uri) => ({ uri })),
      })));
      pendingControlRef.current = null;
      shownSuccessRequestIdRef.current = null;
      await syncAssistantState(result, { appendAssistantMessage: false });
      sessionReadyRef.current = true;
    } catch {
      if (!controller.signal.aborted && activeRequestRef.current === controller) {
        setSessionError("No se pudo cargar tu solicitud. Reintenta en un momento.");
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setIsRestoring(false);
      }
    }
  }, [syncAssistantState]);

  useEffect(() => { void restoreDraft(); }, [restoreDraft]);

  const executeMessageRequests = useCallback(
    async (messageId: string, requests: PurchaseRequestAssistantRequest[]) => {
      if (activeRequestRef.current || !sessionReadyRef.current) return;

      const pendingRequests = requests.map((request) => ({ ...request }));
      const requestSequence = ++requestSequenceRef.current;
      const requestController = new AbortController();
      activeRequestRef.current = requestController;
      setIsSendingMessage(true);
      setIsGeneratingSummary(
        pendingRequests.some((request) => request.ui_action === "SHOW_SUMMARY")
      );
      try {
        for (let index = 0; index < pendingRequests.length; index += 1) {
          const input = pendingRequests[index];
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
                    ? { ...message, failedRequests: pendingRequests.slice(index) }
                    : message
                )
              );
            }
            return;
          }

          await syncAssistantState(result, {
            appendAssistantMessage: input.ui_action !== "CONTINUE",
          });
          if (
            requestController.signal.aborted ||
            activeRequestRef.current !== requestController
          ) {
            return;
          }
          if (!result.ok) {
            if (
              result.error.code !== "PROFILE_SCOPED_REQUEST_ABORTED" &&
              requestSequenceRef.current === requestSequence
            ) {
              setMessages((current) =>
                current.map((message) =>
                  message.id === messageId
                    ? { ...message, failedRequests: pendingRequests.slice(index) }
                    : message
                )
              );
            }
            return;
          }
          if (result.status === "published" || result.status === "cancelled") break;
          if (result.draftId) {
            for (let nextIndex = index + 1; nextIndex < pendingRequests.length; nextIndex += 1) {
              pendingRequests[nextIndex].draft_id = result.draftId;
            }
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
      if (activeRequestRef.current || !sessionReadyRef.current || isSendingMessage || isExecutingControl) return;
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
        !sessionReadyRef.current ||
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
        shouldOpenAssistantSummary(trimmed)
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
        prompt: trimmed,
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

  const executeControl = useCallback(async (action: "CONTINUE" | "PUBLISH" | "DISCARD") => {
    if (!draftId || currentDraftIdRef.current !== draftId || activeRequestRef.current || (!sessionReadyRef.current && action !== "DISCARD") || status === "published" || status === "cancelled") return false;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setIsExecutingControl(true);
    const previous = pendingControlRef.current;
    const input = previous?.ui_action === action && previous.draft_id === draftId
      ? previous : { prompt: "", draft_id: draftId, ui_action: action, ...createPurchaseRequestAssistantRequestIdentity(action) };
    pendingControlRef.current = input;
    try {
      const result = await callPurchaseRequestAssistant({ ...input, signal: controller.signal });
      if (controller.signal.aborted || activeRequestRef.current !== controller) return false;
      if (action === "DISCARD") {
        if (!result.ok || result.status !== "cancelled" || result.purchaseRequestId) {
          if (result.ok || result.error.code !== "PROFILE_SCOPED_REQUEST_ABORTED") {
            showError("No se pudo descartar", result.ok ? "No se confirmó el descarte. Reintenta en un momento." : result.error.message);
          }
          return false;
        }
        requestSequenceRef.current += 1;
        currentDraftIdRef.current = null;
        setDraftId(null);
        setMessages([]);
        setStatus(null);
        setUiState("normal");
        setPendingAction(null);
        setRequiredFields([]);
        setOptionalFields([]);
        setMissingFields([]);
        setCategorySuggestions([]);
        setSummary(null);
        setSummaryText(null);
        setPurchaseRequestId(null);
        setIsReadyToPublish(false);
        setSessionError(null);
        setIsRestoring(false);
        setIsSendingMessage(false);
        setIsGeneratingSummary(false);
        shownSuccessRequestIdRef.current = null;
        sessionReadyRef.current = true;
        setDraftResetKey((value) => value + 1);
      } else {
        await syncAssistantState(result, { appendAssistantMessage: action === "PUBLISH" });
        if (!result.ok) return false;
      }
      pendingControlRef.current = null;
      return true;
    } catch {
      if (!controller.signal.aborted && activeRequestRef.current === controller) {
        showError("No se pudo continuar", "Reintenta en un momento.");
      }
      return false;
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setIsExecutingControl(false);
      }
    }
  }, [draftId, status, syncAssistantState]);

  const continueClarifying = useCallback(async () => { await executeControl("CONTINUE"); }, [executeControl]);
  const publishDraft = useCallback(async () => { await executeControl("PUBLISH"); }, [executeControl]);
  const discardDraft = useCallback(() => executeControl("DISCARD"), [executeControl]);

  const value = useMemo(
    () => ({
      messages,
      isRestoring,
      sessionError,
      restoreDraft,
      discardDraft,
      draftResetKey,
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
      isReadyToPublish,
      canPublish:
        !isRestoring && !sessionError &&
        Boolean(draftId) &&
        isReadyToPublish &&
        uiState === "review" &&
        !isSendingMessage &&
        !isExecutingControl,
      showComposer: status !== "published" && status !== "cancelled",
      canCompose:
        !isRestoring && !sessionError &&
        status !== "cancelled" &&
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
      isRestoring,
      sessionError,
      restoreDraft,
      discardDraft,
      draftResetKey,
      continueClarifying,
      draftId,
      isExecutingControl,
      isGeneratingSummary,
      isReadyToPublish,
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
