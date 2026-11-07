export type BuyerHomeDraft = {
  id: string;
  title: string | null;
  summaryText: string | null;
  updatedAt: string | null;
};

export type BuyerHomeOnboarding = {
  hasPublishedRequests: boolean;
  latestDraft: BuyerHomeDraft | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseBuyerHomeOnboarding(raw: unknown): BuyerHomeOnboarding | null {
  const value = record(raw);
  if (!value || typeof value.has_published_requests !== "boolean") return null;

  let latestDraft: BuyerHomeDraft | null = null;
  if (value.latest_draft !== null) {
    const draft = record(value.latest_draft);
    const id = nullableString(draft?.id);
    if (!draft || !id) return null;
    latestDraft = {
      id,
      title: nullableString(draft.title),
      summaryText: nullableString(draft.summary_text),
      updatedAt: nullableString(draft.updated_at),
    };
  }

  return {
    hasPublishedRequests: value.has_published_requests,
    latestDraft,
  };
}
