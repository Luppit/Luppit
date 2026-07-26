import { LucideIconName } from "@/src/icons/lucide";
import type { ToastVariant } from "@/src/services/toast.service";
import { Theme } from "@/src/themes";

type ThemeColorKey = keyof Theme["colors"];

export type PopupOption = {
  id: string;
  label: string;
  icon?: LucideIconName;
  textColorKey?: ThemeColorKey;
  iconColorKey?: ThemeColorKey;
  backgroundColorKey?: ThemeColorKey;
  onPress?: () => void;
};

export type PopupMenuConfig = {
  type?: "menu";
  options: PopupOption[];
  dismissOnBackdropPress?: boolean;
};

export type PopupSummaryRow = {
  label: string;
  value: string;
};

export type PopupSummaryImage = {
  uri: string;
};

export type PopupSummaryFeedback = {
  tone: ToastVariant;
  title: string;
  message: string;
};

export type PopupSummaryActionOutcome = {
  shouldClose: boolean;
  feedback?: PopupSummaryFeedback;
  inputErrors?: Record<string, string>;
  resetInputIds?: string[];
};

export type PopupSummaryActionResult =
  | void
  | boolean
  | PopupSummaryActionOutcome;

export type PopupSummaryAction = {
  id: string;
  label: string;
  icon?: LucideIconName;
  backgroundColorKey?: ThemeColorKey;
  textColorKey?: ThemeColorKey;
  iconColorKey?: ThemeColorKey;
  disabled?: boolean;
  onPress?: () => PopupSummaryActionResult | Promise<PopupSummaryActionResult>;
};

export type PopupSummaryChoiceOption = {
  value: string;
  methodKind: "shipping" | "pickup";
  label: string;
  feeLabel?: string | null;
  totalLabel?: string | null;
  timingLabel?: string | null;
  availabilityLabel?: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
  setupActionLabel?: string | null;
  onSetupPress?: () => void;
};

export type PopupSummaryInput = {
  id: string;
  kind: string;
  payload_key: string;
  label: string;
  helper_text?: string | null;
  otp_length?: number;
  is_required?: boolean;
  component_config?: Record<string, unknown> | null;
  options?: PopupSummaryChoiceOption[];
  onValueChange?: (value: unknown) => void;
};

export type PopupSummaryBlocker = {
  message: string;
  actionLabel?: string | null;
  onActionPress?: () => void;
};

export type PopupHelperSection = {
  id?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  text?: string;
};

export type PopupHelperConfig = {
  type: "helper";
  title: string;
  subtitle?: string;
  sections: PopupHelperSection[];
  closeLabel?: string;
  dismissOnBackdropPress?: boolean;
};

export type PopupSummaryConfig = {
  type: "summary";
  title: string;
  icon?: LucideIconName;
  metadata?: string;
  showCloseButton?: boolean;
  description?: string;
  descriptionPlacement?: "beforeRows" | "afterRows";
  descriptionScroll?: boolean;
  rows?: PopupSummaryRow[];
  inputs?: PopupSummaryInput[];
  images?: PopupSummaryImage[];
  blocker?: PopupSummaryBlocker | null;
  actions?: PopupSummaryAction[];
  dismissOnBackdropPress?: boolean;
};

export type PopupFilterValues = {
  searchValue: string;
  startDate: string;
  endDate: string;
  selectedChipIds: string[];
  selectedChipGroupIds?: Record<string, string[]>;
};

export type PopupFilterFieldConfig = {
  label: string;
  placeholder?: string;
  initialValue?: string;
};

export type PopupFilterDateRangeConfig = {
  label: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  initialStartValue?: string;
  initialEndValue?: string;
};

export type PopupFilterChipOption = {
  id: string;
  label: string;
  styleCode?: string;
};

export type PopupFilterChipGroupConfig = {
  id?: string;
  label: string;
  options: PopupFilterChipOption[];
  initialSelectedIds?: string[];
};

export type PopupFilterConfig = {
  type: "filters";
  title: string;
  searchField?: PopupFilterFieldConfig;
  dateRangeField?: PopupFilterDateRangeConfig;
  chipGroup?: PopupFilterChipGroupConfig;
  chipGroups?: PopupFilterChipGroupConfig[];
  applyLabel?: string;
  clearLabel?: string;
  dismissOnBackdropPress?: boolean;
  onDismiss?: () => void;
  onApply?: (values: PopupFilterValues) => void;
  onClear?: () => void;
};

export type PopupSortOption = {
  id: string;
  label: string;
};

export type PopupSortConfig = {
  type: "sort";
  title: string;
  options: PopupSortOption[];
  initialSelectedId?: string;
  dismissOnBackdropPress?: boolean;
  onDismiss?: () => void;
  onSelect?: (optionId: string) => void;
};

export type PopupProfileSwitcherItem = {
  id: string;
  title: string;
  subtitle?: string;
  unreadNotificationCount?: number;
  isActive?: boolean;
  onPress?: () => void | Promise<void>;
};

export type PopupProfileSwitcherConfig = {
  type: "profileSwitcher";
  profiles: PopupProfileSwitcherItem[];
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  dismissOnBackdropPress?: boolean;
};

export type PopupSuccessConfig = {
  type: "success";
  title: string;
  description: string;
  actionLabel: string;
  actionBackgroundColorKey?: ThemeColorKey;
  onAction: () => void | Promise<void>;
};

export type PopupConfig =
  | PopupMenuConfig
  | PopupHelperConfig
  | PopupSummaryConfig
  | PopupFilterConfig
  | PopupSortConfig
  | PopupProfileSwitcherConfig
  | PopupSuccessConfig;

type PopupState = {
  config: PopupConfig | null;
};

type PopupListener = (state: PopupState) => void;

const listeners = new Set<PopupListener>();
let currentState: PopupState = { config: null };

function emit() {
  listeners.forEach((listener) => listener(currentState));
}

export function openPopup(config: PopupConfig) {
  currentState = { config };
  emit();
}

export function closePopup() {
  const config = currentState.config;
  const onDismiss =
    config && "onDismiss" in config ? config.onDismiss : undefined;
  currentState = { config: null };
  emit();
  onDismiss?.();
}

export function subscribePopup(listener: PopupListener) {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}
