type GroupableConversationMessage = {
  id: string;
  sender_profile_id: string | null;
  created_at: string;
  message_kind?: string | null;
  text?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  message_group_id?: string | null;
  message_group_index?: number | null;
};

export type ConversationMessageRenderGroup<T> = {
  type: "message" | "messageGroup" | "legacyImageGroup";
  messages: T[];
};

const legacyImageGroupWindowMs = 2 * 60 * 1000;

export function shouldGroupConversationImages(
  previousMessage: GroupableConversationMessage,
  nextMessage: GroupableConversationMessage
) {
  const previousGroupId = previousMessage.message_group_id ?? null;
  const nextGroupId = nextMessage.message_group_id ?? null;
  if (previousGroupId || nextGroupId) {
    return Boolean(previousGroupId) && previousGroupId === nextGroupId;
  }
  if (nextMessage.sender_profile_id !== previousMessage.sender_profile_id) {
    return false;
  }
  const previousTime = new Date(previousMessage.created_at).getTime();
  const nextTime = new Date(nextMessage.created_at).getTime();
  return Number.isFinite(previousTime) && Number.isFinite(nextTime) &&
    Math.abs(nextTime - previousTime) <= legacyImageGroupWindowMs;
}

export function getConversationMessageLogicalKey(
  message: GroupableConversationMessage
) {
  return message.message_group_id && message.message_group_index != null
    ? `group:${message.message_group_id}:${message.message_group_index}`
    : `message:${message.id}`;
}

function isImageOnlyMessage(message: GroupableConversationMessage) {
  return (message.message_kind ?? "").toUpperCase() === "IMAGE" &&
    !message.text?.trim() &&
    Boolean(message.image_url || message.image_path);
}

function compareMessages(
  first: GroupableConversationMessage,
  second: GroupableConversationMessage
) {
  const firstTime = new Date(first.created_at).getTime();
  const secondTime = new Date(second.created_at).getTime();
  if (firstTime !== secondTime) return firstTime - secondTime;

  if (
    first.message_group_id &&
    first.message_group_id === second.message_group_id
  ) {
    const firstIndex = first.message_group_index ?? Number.MAX_SAFE_INTEGER;
    const secondIndex = second.message_group_index ?? Number.MAX_SAFE_INTEGER;
    if (firstIndex !== secondIndex) return firstIndex - secondIndex;
  }
  return first.id.localeCompare(second.id);
}

export function buildConversationMessageRenderGroups<
  T extends GroupableConversationMessage,
>(messages: T[]): ConversationMessageRenderGroup<T>[] {
  const ordered = [...messages].sort(compareMessages);
  const persistedGroups = new Map<string, T[]>();

  for (const message of ordered) {
    if (!message.message_group_id) continue;
    const group = persistedGroups.get(message.message_group_id) ?? [];
    group.push(message);
    persistedGroups.set(message.message_group_id, group);
  }
  for (const group of persistedGroups.values()) {
    group.sort((first, second) =>
      (first.message_group_index ?? Number.MAX_SAFE_INTEGER) -
        (second.message_group_index ?? Number.MAX_SAFE_INTEGER) ||
      compareMessages(first, second)
    );
  }

  const result: ConversationMessageRenderGroup<T>[] = [];
  const consumedGroups = new Set<string>();
  for (let index = 0; index < ordered.length; index += 1) {
    const message = ordered[index];
    const groupId = message.message_group_id ?? null;
    if (groupId) {
      if (!consumedGroups.has(groupId)) {
        const group = persistedGroups.get(groupId) ?? [message];
        result.push({
          type: group.length > 1 ? "messageGroup" : "message",
          messages: group,
        });
        consumedGroups.add(groupId);
      }
      continue;
    }

    if (!isImageOnlyMessage(message)) {
      result.push({ type: "message", messages: [message] });
      continue;
    }

    const legacyImages = [message];
    let nextIndex = index + 1;
    while (nextIndex < ordered.length) {
      const nextMessage = ordered[nextIndex];
      if (
        nextMessage.message_group_id ||
        !isImageOnlyMessage(nextMessage) ||
        !shouldGroupConversationImages(
          legacyImages[legacyImages.length - 1],
          nextMessage
        )
      ) break;
      legacyImages.push(nextMessage);
      nextIndex += 1;
    }
    result.push({
      type: legacyImages.length > 1 ? "legacyImageGroup" : "message",
      messages: legacyImages,
    });
    index = nextIndex - 1;
  }
  return result;
}
