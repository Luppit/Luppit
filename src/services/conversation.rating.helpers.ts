export type PendingRating = {
  conversationId: string;
  actionId: string;
  targetName: string;
  requestTitle: string;
  outcomeLabel: string;
  closedAt: string | null;
  priceLabel: string | null;
};

export type PendingRatings = {
  items: PendingRating[];
  total: number;
  page: number;
  hasMore: boolean;
  ui: {
    title: string;
    countLabel: string;
    actionLabel: string;
    homeActionLabel: string;
    emptyTitle: string;
    emptyDescription: string;
  };
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function parsePendingRatings(raw: unknown): PendingRatings | null {
  const value = record(raw);
  const ui = record(value?.ui);
  if (!value || !ui || !Array.isArray(value.items) ||
    !Number.isInteger(value.total) || (value.total as number) < 0 ||
    !Number.isInteger(value.page) || (value.page as number) < 1 ||
    typeof value.has_more !== "boolean" ||
    ![ui.title, ui.count_label, ui.action_label, ui.home_action_label,
      ui.empty_title, ui.empty_description].every((label) => typeof label === "string")) return null;
  const items: PendingRating[] = [];
  for (const rawItem of value.items) {
    const item = record(rawItem);
    if (!item || ![item.conversation_id, item.action_id, item.target_name,
      item.request_title, item.outcome_label].every((label) => typeof label === "string" && label.trim())) return null;
    items.push({
      conversationId: item.conversation_id as string,
      actionId: item.action_id as string,
      targetName: item.target_name as string,
      requestTitle: item.request_title as string,
      outcomeLabel: item.outcome_label as string,
      closedAt: typeof item.closed_at === "string" ? item.closed_at : null,
      priceLabel: typeof item.price_label === "string" ? item.price_label : null,
    });
  }
  return { items, total: value.total as number, page: value.page as number, hasMore: value.has_more,
    ui: { title: ui.title as string, countLabel: ui.count_label as string,
      actionLabel: ui.action_label as string, homeActionLabel: ui.home_action_label as string,
      emptyTitle: ui.empty_title as string, emptyDescription: ui.empty_description as string } };
}

export type RatingFollowUp = {
  actionId: string;
  targetName: string;
  reminderKey: string | null;
  title: string;
  description: string;
  laterLabel: string;
  actionLabel: string;
};

export function parseRatingFollowUp(context: Record<string, unknown>): RatingFollowUp | null {
  const value = record(context.rating_follow_up);
  if (!value || ![value.action_id, value.target_name, value.title, value.description,
    value.later_label, value.action_label].every((label) => typeof label === "string" && label.trim())) return null;
  return { actionId: value.action_id as string, targetName: value.target_name as string,
    reminderKey: typeof value.reminder_key === "string" ? value.reminder_key : null,
    title: value.title as string, description: value.description as string,
    laterLabel: value.later_label as string, actionLabel: value.action_label as string };
}
