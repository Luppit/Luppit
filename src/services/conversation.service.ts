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

export type ConversationActionExecutor = {
  code: string;
  target: string;
  execution_type: string;
  requires_refresh: boolean;
};

export type ConversationActionConfirmationField = {
  label: string;
  value_source: string;
  value: string;
  sort_order: number;
};

export type ConversationActionConfirmationInput = {
  id: string;
  kind: string;
  payload_key: string;
  label: string;
  helper_text: string | null;
  otp_length: number;
  is_required: boolean;
  sort_order: number;
};

export type ConversationActionConfirmation = {
  id: string;
  code: string;
  title: string;
  description_template: string;
  cancel_label: string;
  cancel_icon: string | null;
  confirm_label: string;
  confirm_icon: string | null;
  confirm_style_code: string | null;
  fields: ConversationActionConfirmationField[];
  inputs: ConversationActionConfirmationInput[];
};

export type ConversationViewAction = {
  id: string;
  code: string;
  label: string;
  icon: string | null;
  style_code: string | null;
  ui_slot: string | null;
  sort_order: number | null;
  executor: ConversationActionExecutor | null;
  confirmation: ConversationActionConfirmation | null;
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
  context: Record<string, unknown>;
  actions: ConversationViewAction[];
};

export type ExecuteConversationActionInput = {
  conversationId: string;
  profileId: string;
  actionCode: string;
  payload?: Record<string, unknown> | null;
};

export type ExecuteConversationActionByExecutorInput = ExecuteConversationActionInput & {
  executor: ConversationActionExecutor;
};

export type ConversationStatusTimelineItem = {
  status_code: string;
  label: string;
  icon: string | null;
  reached_at: string | null;
  reached_at_label: string | null;
  pre_label: string | null;
  is_next: boolean;
  is_completed: boolean;
};

function parseConversationActionExecutor(raw: unknown): ConversationActionExecutor | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const code = typeof value.code === "string" ? value.code : "";
  const target = typeof value.target === "string" ? value.target : "";
  const executionType = typeof value.execution_type === "string" ? value.execution_type : "";

  if (!code || !target || !executionType) return null;

  return {
    code,
    target,
    execution_type: executionType,
    requires_refresh:
      typeof value.requires_refresh === "boolean" ? value.requires_refresh : true,
  };
}

function parseConversationActionConfirmationField(
  raw: unknown
): ConversationActionConfirmationField | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const label = typeof value.label === "string" ? value.label : "";
  if (!label) return null;

  const valueSource = typeof value.value_source === "string" ? value.value_source : "";
  const rawValue = value.value;
  const parsedValue =
    typeof rawValue === "string"
      ? rawValue
      : rawValue == null
        ? ""
        : String(rawValue);

  return {
    label,
    value_source: valueSource,
    value: parsedValue,
    sort_order: typeof value.sort_order === "number" ? value.sort_order : 0,
  };
}

function parseConversationActionConfirmationInput(
  raw: unknown
): ConversationActionConfirmationInput | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const id = typeof value.id === "string" ? value.id : "";
  const kind = typeof value.kind === "string" ? value.kind : "";
  const payloadKey = typeof value.payload_key === "string" ? value.payload_key : "";
  const label = typeof value.label === "string" ? value.label : "";
  if (!id || !kind || !payloadKey || !label) return null;

  return {
    id,
    kind,
    payload_key: payloadKey,
    label,
    helper_text: typeof value.helper_text === "string" ? value.helper_text : null,
    otp_length: typeof value.otp_length === "number" ? value.otp_length : 4,
    is_required: typeof value.is_required === "boolean" ? value.is_required : true,
    sort_order: typeof value.sort_order === "number" ? value.sort_order : 0,
  };
}

function parseConversationActionConfirmation(raw: unknown): ConversationActionConfirmation | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  const id = typeof value.id === "string" ? value.id : "";
  const code = typeof value.code === "string" ? value.code : "";
  const title = typeof value.title === "string" ? value.title : "";
  if (!id || !code || !title) return null;

  const rawFields = Array.isArray(value.fields) ? value.fields : [];
  const fields = rawFields
    .map((field) => parseConversationActionConfirmationField(field))
    .filter((field): field is ConversationActionConfirmationField => Boolean(field))
    .sort((a, b) => a.sort_order - b.sort_order);
  const rawInputs = Array.isArray(value.inputs) ? value.inputs : [];
  const inputs = rawInputs
    .map((input) => parseConversationActionConfirmationInput(input))
    .filter((input): input is ConversationActionConfirmationInput => Boolean(input))
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    id,
    code,
    title,
    description_template:
      typeof value.description_template === "string" ? value.description_template : "",
    cancel_label: typeof value.cancel_label === "string" ? value.cancel_label : "Volver",
    cancel_icon: typeof value.cancel_icon === "string" ? value.cancel_icon : null,
    confirm_label: typeof value.confirm_label === "string" ? value.confirm_label : "Confirmar",
    confirm_icon: typeof value.confirm_icon === "string" ? value.confirm_icon : null,
    confirm_style_code:
      typeof value.confirm_style_code === "string" ? value.confirm_style_code : null,
    fields,
    inputs,
  };
}

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
    executor: parseConversationActionExecutor(value.executor),
    confirmation: parseConversationActionConfirmation(value.confirmation),
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
    context:
      value.context && typeof value.context === "object"
        ? (value.context as Record<string, unknown>)
        : {},
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

export async function getAcceptedConversationByPurchaseRequestId(
  purchaseRequestId: string
): Promise<{ ok: true; data: Conversation } | { ok: false; error: AppError } | null> {
  if (!purchaseRequestId) return { ok: false, error: fromAppError("validation") };

  const conversationsResult = await supabase
    .from("conversation")
    .select("id,purchase_offer_id,status_code,purchase_request_id,buyer_profile_id,seller_profile_id,created_at")
    .eq("purchase_request_id", purchaseRequestId)
    .not("purchase_offer_id", "is", null)
    .order("created_at", { ascending: false });

  if (conversationsResult.error) {
    return { ok: false, error: fromSupabaseError(conversationsResult.error) };
  }

  const conversations = (conversationsResult.data ?? []) as Conversation[];
  if (conversations.length === 0) return null;

  const actionResult = await supabase
    .from("conversation_action")
    .select("id")
    .eq("code", "BUYER_ACCEPT_OFFER")
    .maybeSingle();

  if (actionResult.error) {
    return { ok: false, error: fromSupabaseError(actionResult.error) };
  }

  const actionId = actionResult.data?.id;
  if (!actionId) {
    return { ok: true, data: conversations[0] };
  }

  const conversationIds = conversations.map((conversation) => conversation.id);
  const historyResult = await supabase
    .from("conversation_status_history")
    .select("conversation_id,created_at")
    .eq("action_id", actionId)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false })
    .limit(1);

  if (historyResult.error) {
    return { ok: false, error: fromSupabaseError(historyResult.error) };
  }

  const acceptedConversationId = historyResult.data?.[0]?.conversation_id ?? null;
  if (!acceptedConversationId) {
    return { ok: true, data: conversations[0] };
  }

  const acceptedConversation =
    conversations.find((conversation) => conversation.id === acceptedConversationId) ?? null;
  if (!acceptedConversation) return { ok: true, data: conversations[0] };

  return { ok: true, data: acceptedConversation };
}

export async function getConversationTimeline(
  conversationId: string
): Promise<{ ok: true; data: ConversationStatusTimelineItem[] } | { ok: false; error: AppError }> {
  if (!conversationId) return { ok: false, error: fromAppError("validation") };

  const rpcResult: any = await (supabase as any).rpc("get_conversation_timeline", {
    p_conversation_id: conversationId,
  });

  if (rpcResult.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }
  const rows = Array.isArray(rpcResult.data)
    ? (rpcResult.data as Record<string, unknown>[])
    : [];

  const timeline = rows
    .map((row) => {
      const statusCode = typeof row.status_code === "string" ? row.status_code : "";
      const label = typeof row.label === "string" ? row.label : "";
      if (!statusCode || !label) return null;

      return {
        status_code: statusCode,
        label,
        icon: typeof row.icon === "string" ? row.icon : null,
        reached_at: typeof row.reached_at === "string" ? row.reached_at : null,
        reached_at_label:
          typeof row.reached_at_label === "string" ? row.reached_at_label : null,
        pre_label: typeof row.pre_label === "string" ? row.pre_label : null,
        is_next: row.is_next === true,
        is_completed: row.is_completed === true,
      } satisfies ConversationStatusTimelineItem;
    })
    .filter((item): item is ConversationStatusTimelineItem => Boolean(item));

  return { ok: true, data: timeline };
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

export async function executeConversationAction(
  input: ExecuteConversationActionInput
): Promise<{ ok: true; data: unknown } | { ok: false; error: AppError }> {
  const actionCode = input.actionCode.trim();
  if (!input.conversationId || !input.profileId || !actionCode) {
    return { ok: false, error: fromAppError("validation") };
  }

  const rpcResult: any = await (supabase as any).rpc("execute_conversation_action", {
    p_conversation_id: input.conversationId,
    p_profile_id: input.profileId,
    p_action_code: actionCode,
    p_payload: input.payload ?? null,
  });

  if (rpcResult.error) return { ok: false, error: fromSupabaseError(rpcResult.error) };

  return { ok: true, data: rpcResult.data ?? null };
}

function normalizeRpcTarget(target: string): string {
  return target.includes(".") ? target.split(".").pop() ?? target : target;
}

export async function executeConversationActionByExecutor(
  input: ExecuteConversationActionByExecutorInput
): Promise<{ ok: true; data: unknown } | { ok: false; error: AppError }> {
  if (input.executor.execution_type !== "server_rpc") {
    return { ok: true, data: null };
  }

  const rpcName = normalizeRpcTarget(input.executor.target).trim();
  if (!rpcName) {
    return executeConversationAction(input);
  }

  const payload = input.payload ?? null;
  const variants = [
    {
      p_conversation_id: input.conversationId,
      p_profile_id: input.profileId,
      p_action_code: input.actionCode,
      p_payload: payload,
    },
    {
      p_conversation_id: input.conversationId,
      p_profile_id: input.profileId,
      p_action_code: input.actionCode,
    },
    {
      p_conversation_id: input.conversationId,
      p_profile_id: input.profileId,
    },
    {
      conversation_id: input.conversationId,
      profile_id: input.profileId,
    },
  ];

  let lastError: any = null;
  for (const args of variants) {
    const rpcResult: any = await (supabase as any).rpc(rpcName, args);
    if (!rpcResult.error) {
      return { ok: true, data: rpcResult.data ?? null };
    }
    lastError = rpcResult.error;
  }

  const fallback = await executeConversationAction(input);
  if (fallback.ok) return fallback;

  return lastError
    ? { ok: false, error: fromSupabaseError(lastError) }
    : fallback;
}
