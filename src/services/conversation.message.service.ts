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
  message_group_id?: string | null;
  message_group_index?: number | null;
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
  messageGroupId?: string;
};

const MAX_CONVERSATION_IMAGE_BYTES = 4_000_000;
const MAX_CONVERSATION_IMAGES = 10;
const ALLOWED_CONVERSATION_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const ALLOWED_CONVERSATION_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);
const CONVERSATION_IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function createConversationMessageGroupId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getFileExtension(file: ConversationMessageImage, fallback = "jpg") {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  const fromUri = file.uri.split("?")[0].split(".").pop()?.toLowerCase();
  if (fromUri) return fromUri;

  const fromMime = file.mime?.split("/").pop()?.toLowerCase();
  if (fromMime) return fromMime;

  return fallback;
}

type PreparedConversationImage = {
  body: ArrayBuffer;
  extension: string;
  contentType: string;
};

async function prepareConversationImage(
  file: ConversationMessageImage,
): Promise<
  { ok: true; data: PreparedConversationImage } | { ok: false; error: AppError }
> {
  const extension = getFileExtension(file);
  const mime = file.mime?.toLowerCase() ?? null;
  if (
    !ALLOWED_CONVERSATION_IMAGE_EXTENSIONS.has(extension) ||
    (mime && !ALLOWED_CONVERSATION_IMAGE_MIME_TYPES.has(mime)) ||
    (typeof file.size === "number" && file.size > MAX_CONVERSATION_IMAGE_BYTES)
  ) {
    return {
      ok: false,
      error: {
        type: "validation",
        code: "invalid_conversation_image",
        message: "Usa una imagen JPG, PNG o WebP de hasta 4 MB.",
      },
    };
  }

  let body: ArrayBuffer;
  try {
    const response = await fetch(file.uri);
    body = await response.arrayBuffer();
  } catch {
    return {
      ok: false,
      error: {
        type: "validation",
        code: "conversation_image_unreadable",
        message: "No se pudo leer una de las imágenes seleccionadas.",
      },
    };
  }
  if (body.byteLength > MAX_CONVERSATION_IMAGE_BYTES) {
    return {
      ok: false,
      error: {
        type: "validation",
        code: "conversation_image_too_large",
        message: "La imagen debe pesar 4 MB o menos.",
      },
    };
  }

  return {
    ok: true,
    data: {
      body,
      extension,
      contentType: mime ?? CONVERSATION_IMAGE_MIME_BY_EXTENSION[extension],
    },
  };
}

async function uploadConversationImage(
  conversationId: string,
  profileId: string,
  file: PreparedConversationImage,
): Promise<{ ok: true; data: string } | { ok: false; error: AppError }> {
  const filePath =
    `pending/${profileId}/${conversationId}/${createConversationMessageGroupId()}.${file.extension}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.conversations)
    .upload(filePath, file.body, {
      contentType: file.contentType,
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

  const result = await sendModeratedConversationMessage(conversationId, profile.data.id, {
    messageGroupId: createConversationMessageGroupId(),
    text: text.trim(),
    pendingImagePaths: [],
  });
  if (!result.ok) return result;
  const message = result.data[0];
  return message
    ? { ok: true, data: message }
    : { ok: false, error: fromAppError("unknown") };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function hasJsonResponse(
  value: unknown
): value is { json: () => Promise<unknown>; clone?: () => unknown } {
  return Boolean(value) && typeof (value as { json?: unknown }).json === "function";
}

async function mapModeratedMessageFunctionError(error: unknown): Promise<AppError> {
  const context = toRecord(error)?.context;
  let payload: Record<string, unknown> | null = null;

  if (hasJsonResponse(context)) {
    try {
      const response = typeof context.clone === "function" ? context.clone() : context;
      payload = toRecord(await (hasJsonResponse(response) ? response : context).json());
    } catch {
      payload = null;
    }
  }

  const errorCode =
    typeof payload?.error_code === "string" ? payload.error_code.trim() : "";
  return errorCode
    ? fromSupabaseError({
        error_code: errorCode,
        code: errorCode,
        message: errorCode,
      })
    : fromSupabaseError(error);
}

async function sendModeratedConversationMessage(
  conversationId: string,
  profileId: string,
  message: {
    messageGroupId: string;
    text: string | null;
    pendingImagePaths: string[];
  }
): Promise<{ ok: true; data: ConversationMessage[] } | { ok: false; error: AppError }> {
  const functionResult = await supabase.functions.invoke(
    "send-moderated-conversation-message",
    {
      body: {
        conversationId,
        profileId,
        messageGroupId: message.messageGroupId,
        text: message.text,
        pendingImagePaths: message.pendingImagePaths,
      },
    }
  );

  if (functionResult.error) {
    if (message.pendingImagePaths.length > 0) {
      await supabase.storage
        .from(STORAGE_BUCKETS.conversations)
        .remove(message.pendingImagePaths);
    }
    return {
      ok: false,
      error: await mapModeratedMessageFunctionError(functionResult.error),
    };
  }

  const response = toRecord(functionResult.data);
  const createdMessages = Array.isArray(response?.messages)
    ? response.messages
    : response?.message && typeof response.message === "object"
      ? [response.message]
      : [];
  if (createdMessages.length === 0) {
    return { ok: false, error: fromAppError("unknown") };
  }
  return { ok: true, data: createdMessages as ConversationMessage[] };
}

export async function createConversationMessages(
  input: SendConversationMessageInput
): Promise<{ ok: true; data: ConversationMessage[] } | { ok: false; error: AppError }> {
  const conversationId = input.conversationId;
  const text = input.text?.trim() ?? "";
  const images = input.images ?? [];

  if (
    !conversationId ||
    (!text && images.length === 0) ||
    images.length > MAX_CONVERSATION_IMAGES
  ) {
    return { ok: false, error: fromAppError("validation") };
  }

  const session = await getSession();
  if (!session?.user.id) return { ok: false, error: fromAppError("auth") };

  const profile = await getCurrentProfileResult();
  if (profile?.ok === false) return { ok: false, error: profile.error };
  if (!profile) return { ok: false, error: fromAppError("not_found") };

  const messageGroupId = input.messageGroupId ?? createConversationMessageGroupId();
  const pendingImagePaths: string[] = [];
  const preparedImages: PreparedConversationImage[] = [];

  for (const image of images) {
    const prepared = await prepareConversationImage(image);
    if (!prepared.ok) return prepared;
    preparedImages.push(prepared.data);
  }

  for (let i = 0; i < preparedImages.length; i += 1) {
    const uploaded = await uploadConversationImage(
      conversationId,
      profile.data.id,
      preparedImages[i]
    );
    if (!uploaded.ok) {
      if (pendingImagePaths.length > 0) {
        await supabase.storage
          .from(STORAGE_BUCKETS.conversations)
          .remove(pendingImagePaths);
      }
      return uploaded;
    }
    pendingImagePaths.push(uploaded.data);
  }

  const created = await sendModeratedConversationMessage(
    conversationId,
    profile.data.id,
    { messageGroupId, text: text || null, pendingImagePaths }
  );
  if (!created.ok) return created;

  const createdWithUrls = await withSignedImageUrls(created.data);
  return { ok: true, data: createdWithUrls };
}
