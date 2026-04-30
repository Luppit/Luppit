import { InsertRow, Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import { getProfileByUserId } from "./profile.service";

export type ConversationMessage = Row<"conversation_message"> & {
  image_path?: string | null;
  image_url?: string | null;
};

export type ConversationMessageImage = {
  uri: string;
  mime?: string | null;
  size?: number | null;
  name?: string | null;
};

type SendConversationMessageInput = {
  conversationId: string;
  text?: string;
  images?: ConversationMessageImage[];
};

function getFileExtension(file: ConversationMessageImage, fallback = "jpg") {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  const fromUri = file.uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUri) return fromUri;

  const fromMime = file.mime?.split("/").pop()?.toLowerCase();
  if (fromMime) return fromMime;

  return fallback;
}

async function uploadConversationImage(
  conversationId: string,
  file: ConversationMessageImage,
  index: number
): Promise<{ ok: true; data: string } | { ok: false; error: AppError }> {
  const extension = getFileExtension(file);
  const filePath = `${conversationId}/${Date.now()}_${index}.${extension}`;

  const response = await fetch(file.uri);
  const body = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from("conversations")
    .upload(filePath, body, {
      contentType: file.mime ?? undefined,
      upsert: false,
    });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: filePath };
}

async function withSignedImageUrls(
  messages: ConversationMessage[]
): Promise<ConversationMessage[]> {
  const result: ConversationMessage[] = [];
  const supabaseBaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? (supabase as any).supabaseUrl ?? "";

  const toAbsoluteStorageUrl = (rawUrl: string | null | undefined) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
    if (!supabaseBaseUrl) return rawUrl;
    const normalizedBase = supabaseBaseUrl.replace(/\/$/, "");
    const normalizedRaw = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;

    if (normalizedRaw.startsWith("/storage/v1/")) {
      return `${normalizedBase}${normalizedRaw}`;
    }

    return `${normalizedBase}/storage/v1${normalizedRaw}`;
  };

  for (const message of messages) {
    const imagePath = message.image_path ?? null;
    if (!imagePath) {
      result.push(message);
      continue;
    }

    const signed = await supabase.storage
      .from("conversations")
      .createSignedUrl(imagePath, 60 * 60);

    const fallbackPublic = supabase.storage
      .from("conversations")
      .getPublicUrl(imagePath);

    const signedData: any = signed.data;
    const rawSignedUrl = signed.error
      ? null
      : signedData?.signedUrl ?? signedData?.signedURL ?? null;
    const signedUrl = toAbsoluteStorageUrl(rawSignedUrl);

    result.push({
      ...message,
      image_url: signedUrl ?? fallbackPublic.data.publicUrl ?? null,
    });
  }

  return result;
}

export async function getConversationMessagesByConversationId(
  conversationId: string
): Promise<{ ok: true; data: ConversationMessage[] } | { ok: false; error: AppError }> {
  if (!conversationId) return { ok: false, error: fromAppError("validation") };

  const rpcResult: any = await (supabase as any).rpc("get_conversation_messages", {
    p_conversation_id: conversationId,
  });

  if (!rpcResult.error && Array.isArray(rpcResult.data)) {
    const messagesWithUrls = await withSignedImageUrls(
      rpcResult.data as ConversationMessage[]
    );
    return { ok: true, data: messagesWithUrls };
  }

  const { data, error } = await supabase
    .from("conversation_message")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: fromSupabaseError(error) };
  const messagesWithUrls = await withSignedImageUrls(
    (data ?? []) as ConversationMessage[]
  );
  return { ok: true, data: messagesWithUrls };
}

export async function createConversationTextMessage(
  conversationId: string,
  text: string
): Promise<{ ok: true; data: ConversationMessage } | { ok: false; error: AppError }> {
  if (!conversationId || !text.trim()) {
    return { ok: false, error: fromAppError("validation") };
  }

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult: any = await (supabase as any).rpc("send_conversation_message", {
    p_conversation_id: conversationId,
    p_profile_id: profile.data.id,
    p_text: text.trim(),
    p_message_kind: "TEXT",
    p_image_path: null,
  });

  if (!rpcResult.error && rpcResult.data) {
    const rpcData = Array.isArray(rpcResult.data)
      ? rpcResult.data[0]
      : rpcResult.data;
    if (rpcData) {
      return { ok: true, data: rpcData as ConversationMessage };
    }
  }

  const payload: InsertRow<"conversation_message"> = {
    conversation_id: conversationId,
    sender_profile_id: profile.data.id,
    text: text.trim(),
    message_kind: "TEXT",
  };

  const { data, error } = await supabase
    .from("conversation_message")
    .insert(payload)
    .select("*")
    .single();

  if (error) return { ok: false, error: fromSupabaseError(error) };
  return { ok: true, data: data as ConversationMessage };
}

export async function createConversationMessages(
  input: SendConversationMessageInput
): Promise<{ ok: true; data: ConversationMessage[] } | { ok: false; error: AppError }> {
  const conversationId = input.conversationId;
  const text = input.text?.trim() ?? "";
  const images = input.images ?? [];

  if (!conversationId || (!text && images.length === 0)) {
    return { ok: false, error: fromAppError("validation") };
  }

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getProfileByUserId(session.user.id);
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const created: ConversationMessage[] = [];

  if (text) {
    const textMessage = await createConversationTextMessage(conversationId, text);
    if (!textMessage.ok) return textMessage;
    created.push(textMessage.data);
  }

  for (let i = 0; i < images.length; i += 1) {
    const uploaded = await uploadConversationImage(conversationId, images[i], i);
    if (!uploaded.ok) return uploaded;

    const rpcResult: any = await (supabase as any).rpc("send_conversation_message", {
      p_conversation_id: conversationId,
      p_profile_id: profile.data.id,
      p_text: null,
      p_message_kind: "IMAGE",
      p_image_path: uploaded.data,
    });

    if (!rpcResult.error && rpcResult.data) {
      const rpcData = Array.isArray(rpcResult.data)
        ? rpcResult.data[0]
        : rpcResult.data;
      if (rpcData) {
        created.push(rpcData as ConversationMessage);
        continue;
      }
    }

    const payload: InsertRow<"conversation_message"> & { image_path?: string | null } =
      {
        conversation_id: conversationId,
        sender_profile_id: profile.data.id,
        text: null,
        message_kind: "IMAGE",
        image_path: uploaded.data,
      };

    const inserted = await supabase
      .from("conversation_message")
      .insert(payload as any)
      .select("*")
      .single();

    if (inserted.error) return { ok: false, error: fromSupabaseError(inserted.error) };
    created.push(inserted.data as ConversationMessage);
  }

  const createdWithUrls = await withSignedImageUrls(created);
  return { ok: true, data: createdWithUrls };
}
