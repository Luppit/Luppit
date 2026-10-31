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

export type ProfileSetupChecklist = {
  locationId: string | null;
  locationLabel: string | null;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  steps: SellerBusinessSetupStep[];
};

export type SellerBusinessSetup = ProfileSetupChecklist & {
  businessId: string;
};

export type BuyerProfileSetup = ProfileSetupChecklist & {
  profileId: string;
};

export type SellerLocationAvailability = {
  status: "available" | "unavailable" | "location_required";
  message: string | null;
  notificationRequested: boolean;
  locationId: string | null;
  locationLabel: string | null;
  canEdit: boolean;
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

function parseProfileSetup(
  raw: unknown,
  expectedCodes: SellerBusinessSetupStepCode[]
): ProfileSetupChecklist | null {
  const value = record(raw);
  if (!value ||
    !Array.isArray(value.steps) || value.steps.length !== expectedCodes.length ||
    typeof value.completed_count !== "number" || !Number.isInteger(value.completed_count) ||
    value.total_count !== expectedCodes.length || typeof value.is_complete !== "boolean") {
    return null;
  }

  const steps: SellerBusinessSetupStep[] = [];
  for (const rawStep of value.steps) {
    const step = record(rawStep);
    if (!step || !expectedCodes.includes(step.code as SellerBusinessSetupStepCode) ||
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
    locationId: nullableString(value.location_id),
    locationLabel: nullableString(value.location_label),
    completedCount: value.completed_count,
    totalCount: value.total_count,
    isComplete: value.is_complete,
    steps,
  };
}

export function parseSellerBusinessSetup(raw: unknown): SellerBusinessSetup | null {
  const value = record(raw);
  if (typeof value?.business_id !== "string" || !value.business_id) return null;
  const setup = parseProfileSetup(value, stepCodes);
  return setup ? { ...setup, businessId: value.business_id } : null;
}

export function parseBuyerProfileSetup(raw: unknown): BuyerProfileSetup | null {
  const value = record(raw);
  if (typeof value?.profile_id !== "string" || !value.profile_id) return null;
  const setup = parseProfileSetup(value, ["email", "location", "photo", "notifications"]);
  return setup ? { ...setup, profileId: value.profile_id } : null;
}

export function parseSellerLocationAvailability(raw: unknown): SellerLocationAvailability | null {
  const value = record(raw);
  if (!value || !["available", "unavailable", "location_required"].includes(String(value.availability_status)) ||
    typeof value.notification_requested !== "boolean" || typeof value.can_edit !== "boolean") return null;
  return {
    status: value.availability_status as SellerLocationAvailability["status"],
    message: nullableString(value.availability_message),
    notificationRequested: value.notification_requested,
    locationId: nullableString(value.location_id),
    locationLabel: nullableString(value.location_label),
    canEdit: value.can_edit,
  };
}
