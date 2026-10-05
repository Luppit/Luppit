import { fromAppError, type AppError } from "../lib/supabase/errors";
import { getCurrentUserConversationView } from "./conversation.service";
import { getConversationMessagesByConversationId } from "./conversation.message.service";
import { getPurchaseRequestById } from "./purchase.request.service";

export type OfferRequestReference = {
  id: string;
  title: string | null;
  text: string | null;
  source: "conversation" | "request";
};

export async function getOfferRequestReference(
  conversationId: string
): Promise<{ ok: true; data: OfferRequestReference } | { ok: false; error: AppError }> {
  const view = await getCurrentUserConversationView(conversationId);
  if (!view.ok) return view;

  const conversation = view.data.conversation;
  const requestId = conversation.purchase_request_id;
  if (conversation.id !== conversationId || !requestId) {
    return { ok: false, error: fromAppError("not_found") };
  }

  const rawReference = view.data.context?.offer_request_reference;
  const reference = rawReference && typeof rawReference === "object"
    ? rawReference as Record<string, unknown>
    : null;
  if (reference && reference.id !== requestId) {
    return { ok: false, error: fromAppError("not_found") };
  }
  const description = reference?.description ?? view.data.presentation?.request_brief?.description;
  if (typeof description === "string" && description.trim()) {
    return {
      ok: true,
      data: {
        id: requestId,
        title: typeof reference?.title === "string" ? reference.title
          : typeof view.data.context?.offer_name === "string" ? view.data.context.offer_name : null,
        text: description,
        source: "conversation",
      },
    };
  }

  const messages = await getConversationMessagesByConversationId(conversationId);
  if (!messages.ok) return messages;

  // Older conversations stored the request snapshot as their first buyer text.
  const firstMessage = messages.data
    .filter((message) => message.conversation_id === conversationId && message.message_kind !== "SYSTEM")
    .sort((first, second) => Date.parse(first.created_at) - Date.parse(second.created_at))[0];
  const snapshot = conversation.buyer_profile_id &&
    firstMessage?.sender_profile_id === conversation.buyer_profile_id &&
    firstMessage.message_kind === "TEXT" && firstMessage.text?.trim()
    ? firstMessage.text
    : null;

  const request = await getPurchaseRequestById(requestId);
  const currentRequest = request?.ok && request.data.id === requestId ? request.data : null;
  if (snapshot) {
    return { ok: true, data: { id: requestId, title: currentRequest?.title ?? null, text: snapshot, source: "conversation" } };
  }
  if (request?.ok === false) return request;
  if (!currentRequest) return { ok: false, error: fromAppError("not_found") };

  return {
    ok: true,
    data: {
      id: requestId,
      title: currentRequest.title,
      text: [
        currentRequest.title?.trim() ? `Título: ${currentRequest.title}` : null,
        currentRequest.summary_text?.trim() ? `Resumen: ${currentRequest.summary_text}` : null,
      ].filter(Boolean).join("\n\n") || null,
      source: "request",
    },
  };
}
