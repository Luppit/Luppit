import { RPC_FUNCTIONS } from "../db/functions";
import { Row } from "../db/types";
import { getSession } from "../lib/supabase";
import { supabase } from "../lib/supabase/client";
import { AppError, fromAppError, fromSupabaseError } from "../lib/supabase/errors";
import {
  getSignedStorageUrl,
  parseStorageImagePath,
  STORAGE_BUCKETS,
  toAbsoluteStorageUrl,
} from "../lib/supabase/storage";
import { getCurrentProfileResult } from "./active.profile.service";

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
    .from(STORAGE_BUCKETS.conversations)
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

  for (const message of messages) {
    const imagePath = message.image_path ?? null;
    if (!imagePath) {
      result.push(message);
      continue;
    }

    const storageImage = parseStorageImagePath(
      imagePath,
      STORAGE_BUCKETS.conversations
    );

    const signed = await supabase.storage
      .from(storageImage.bucket)
      .createSignedUrl(storageImage.path, 60 * 60);

    const fallbackPublic = supabase.storage
      .from(storageImage.bucket)
      .getPublicUrl(storageImage.path);

    const rawSignedUrl = signed.error ? null : getSignedStorageUrl(signed.data);
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

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const rpcResult = await supabase.rpc(
    RPC_FUNCTIONS.GET_CONVERSATION_MESSAGES,
    {
      p_conversation_id: conversationId,
      p_profile_id: profile.data.id,
    }
  );

  if (rpcResult.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const messagesWithUrls = await withSignedImageUrls(
    (Array.isArray(rpcResult.data) ? rpcResult.data : []) as ConversationMessage[]
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

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  return sendConversationMessage(conversationId, profile.data.id, {
    text: text.trim(),
    kind: "TEXT",
    imagePath: null,
  });
}

async function sendConversationMessage(
  conversationId: string,
  profileId: string,
  message: {
    text: string | null;
    kind: "TEXT" | "IMAGE";
    imagePath: string | null;
  }
): Promise<{ ok: true; data: ConversationMessage } | { ok: false; error: AppError }> {
  const rpcResult = await supabase.rpc(
    RPC_FUNCTIONS.SEND_CONVERSATION_MESSAGE,
    {
      p_conversation_id: conversationId,
      p_profile_id: profileId,
      p_text: message.text,
      p_message_kind: message.kind,
      p_image_path: message.imagePath,
    } as never
  );

  if (rpcResult.error) {
    return { ok: false, error: fromSupabaseError(rpcResult.error) };
  }

  const rpcData = Array.isArray(rpcResult.data)
    ? rpcResult.data[0]
    : rpcResult.data;
  if (!rpcData) return { ok: false, error: fromAppError("unknown") };
  return { ok: true, data: rpcData as ConversationMessage };
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

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const created: ConversationMessage[] = [];

  if (text) {
    const textMessage = await sendConversationMessage(
      conversationId,
      profile.data.id,
      { text, kind: "TEXT", imagePath: null }
    );
    if (!textMessage.ok) return textMessage;
    created.push(textMessage.data);
  }

  for (let i = 0; i < images.length; i += 1) {
    const uploaded = await uploadConversationImage(conversationId, images[i], i);
    if (!uploaded.ok) return uploaded;

    const imageMessage = await sendConversationMessage(
      conversationId,
      profile.data.id,
      { text: null, kind: "IMAGE", imagePath: uploaded.data }
    );
    if (!imageMessage.ok) return imageMessage;
    created.push(imageMessage.data);
  }

  const createdWithUrls = await withSignedImageUrls(created);
  return { ok: true, data: createdWithUrls };
}
