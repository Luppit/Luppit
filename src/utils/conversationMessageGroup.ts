type GroupableConversationMessage = {
  sender_profile_id: string | null;
  created_at: string;
  message_group_id?: string | null;
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
