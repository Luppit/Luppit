import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getProfileByUserId } from "./profile.service";

export type Conversation = Row<"conversation">;

export type ConversationViewPermission = {
  can_send_messages: boolean;
  can_send_attachments: boolean;
};

export type ConversationViewAction = {
  id: string;
  code: string;
  label: string;
  icon: string | null;
  style_code: string | null;
  ui_slot: string | null;
  sort_order: number | null;
};

export type ConversationView = {
  conversation: {
    id: string;
    status_code: string | null;
    purchase_request_id: string | null;
    purchase_offer_id: string | null;
    buyer_profile_id: string | null;
    seller_profile_id: string | null;
  };
  role_code: string;
  permissions: ConversationViewPermission;
  actions: ConversationViewAction[];
};

function parseConversationViewAction(raw: unknown): ConversationViewAction | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : "";
  if (!id) return null;

  const code = typeof value.code === "string" ? value.code : "";
  const label = typeof value.label === "string" ? value.label : "";

  return {
    id,
    code,
    label,
    icon:
      typeof value.icon === "string"
        ? value.icon
        : typeof value.icon_key === "string"
          ? value.icon_key
          : null,
    style_code:
      typeof value.style_code === "string"
        ? value.style_code
        : typeof value.style_key === "string"
          ? value.style_key
          : null,
    ui_slot: typeof value.ui_slot === "string" ? value.ui_slot : null,
    sort_order: typeof value.sort_order === "number" ? value.sort_order : null,
  };
}

function parseConversationView(raw: unknown): ConversationView | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const conversationValue =
    value.conversation && typeof value.conversation === "object"
      ? (value.conversation as Record<string, unknown>)
      : null;
  if (!conversationValue || typeof conversationValue.id !== "string") return null;

  const permissionsValue =
    value.permissions && typeof value.permissions === "object"
      ? (value.permissions as Record<string, unknown>)
      : {};

  const rawActions = Array.isArray(value.actions) ? value.actions : [];
  const actions = rawActions
    .map((action) => parseConversationViewAction(action))
    .filter((action): action is ConversationViewAction => Boolean(action));

  return {
    conversation: {
      id: conversationValue.id,
      status_code:
        typeof conversationValue.status_code === "string"
          ? conversationValue.status_code
          : null,
      purchase_request_id:
        typeof conversationValue.purchase_request_id === "string"
          ? conversationValue.purchase_request_id
          : null,
      purchase_offer_id:
        typeof conversationValue.purchase_offer_id === "string"
          ? conversationValue.purchase_offer_id
          : null,
      buyer_profile_id:
        typeof conversationValue.buyer_profile_id === "string"
          ? conversationValue.buyer_profile_id
          : null,
      seller_profile_id:
        typeof conversationValue.seller_profile_id === "string"
          ? conversationValue.seller_profile_id
          : null,
    },
    role_code: typeof value.role_code === "string" ? value.role_code : "",
    permissions: {
      can_send_messages:
        typeof permissionsValue.can_send_messages === "boolean"
          ? permissionsValue.can_send_messages
          : false,
      can_send_attachments:
        typeof permissionsValue.can_send_attachments === "boolean"
          ? permissionsValue.can_send_attachments
          : false,
    },
    actions,
  };
}

export async function getConversationByPurchaseOfferId(
  purchaseOfferId: string
): Promise<{ ok: true; data: Conversation } | { ok: false; error: AppError } | null> {
  const { data, error } = await supabase
    .from("conversation")
    .select("*")
    .eq("purchase_offer_id", purchaseOfferId)
    .maybeSingle();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  if (!data) return null;
  return { ok: true, data: data as Conversation };
}

export async function getConversationView(
  conversationId: string,
  profileId: string
): Promise<{ ok: true; data: ConversationView } | { ok: false; error: AppError }> {
  if (!conversationId || !profileId) {
    return { ok: false, error: fromAppError("validation") };
  }

  const { data, error } = await supabase.rpc("get_conversation_view", {
    p_conversation_id: conversationId,
    p_profile_id: profileId,
  });

  if (error) return { ok: false, error: fromSupabaseError(error) };

  const parsed = parseConversationView(data);
  if (!parsed) return { ok: false, error: fromAppError("unknown") };

  return { ok: true, data: parsed };
}

export async function getCurrentUserConversationView(
  conversationId: string
): Promise<
  | { ok: true; data: ConversationView; profileId: string }
  | { ok: false; error: AppError }
> {
  if (!conversationId) return { ok: false, error: fromAppError("validation") };

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const view = await getConversationView(conversationId, profile.data.id);
  if (!view.ok) return view;

  return { ok: true, data: view.data, profileId: profile.data.id };
}
