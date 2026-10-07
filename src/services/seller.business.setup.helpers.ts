export type SellerBusinessSetupStepCode =
  | "email"
  | "categories"
  | "location"
  | "photo"
  | "notifications";

export type SellerBusinessSetupStep = {
  code: SellerBusinessSetupStepCode;
  label: string;
  icon: string;
  description: string | null;
  actionLabel: string;
  isComplete: boolean;
  canEdit: boolean;
};

export type SellerBusinessSetup = {
  businessId: string;
  locationId: string | null;
  locationLabel: string | null;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  steps: SellerBusinessSetupStep[];
};

const stepCodes: SellerBusinessSetupStepCode[] = [
  "email", "categories", "location", "photo", "notifications",
];

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function parseSellerBusinessSetup(raw: unknown): SellerBusinessSetup | null {
  const value = record(raw);
  if (!value || typeof value.business_id !== "string" || !value.business_id ||
    !Array.isArray(value.steps) || value.steps.length !== stepCodes.length ||
    typeof value.completed_count !== "number" || !Number.isInteger(value.completed_count) ||
    value.total_count !== stepCodes.length || typeof value.is_complete !== "boolean") {
    return null;
  }

  const steps: SellerBusinessSetupStep[] = [];
  for (const rawStep of value.steps) {
    const step = record(rawStep);
    if (!step || !stepCodes.includes(step.code as SellerBusinessSetupStepCode) ||
      steps.some((item) => item.code === step.code) ||
      typeof step.label !== "string" || !step.label.trim() ||
      typeof step.icon !== "string" || typeof step.action_label !== "string" ||
      typeof step.is_complete !== "boolean" || typeof step.can_edit !== "boolean") {
      return null;
    }
    steps.push({
      code: step.code as SellerBusinessSetupStepCode,
      label: step.label,
      icon: step.icon,
      description: nullableString(step.description),
      actionLabel: step.action_label,
      isComplete: step.is_complete,
      canEdit: step.can_edit,
    });
  }

  if (value.completed_count !== steps.filter((step) => step.isComplete).length ||
    value.is_complete !== (value.completed_count === value.total_count)) return null;

  return {
    businessId: value.business_id,
    locationId: nullableString(value.location_id),
    locationLabel: nullableString(value.location_label),
    completedCount: value.completed_count,
    totalCount: value.total_count,
    isComplete: value.is_complete,
    steps,
  };
}
