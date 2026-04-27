import { LucideIconName } from "@/src/icons/lucide";
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

export type PopupSummaryAction = {
  id: string;
  label: string;
  icon?: LucideIconName;
  backgroundColorKey?: ThemeColorKey;
  textColorKey?: ThemeColorKey;
  iconColorKey?: ThemeColorKey;
  onPress?: () => void;
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
  onValueChange?: (value: unknown) => void;
};

export type PopupSummaryConfig = {
  type: "summary";
  title: string;
  icon?: LucideIconName;
  description?: string;
  rows?: PopupSummaryRow[];
  inputs?: PopupSummaryInput[];
  images?: PopupSummaryImage[];
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
  onSelect?: (optionId: string) => void;
};

export type PopupConfig =
  | PopupMenuConfig
  | PopupSummaryConfig
  | PopupFilterConfig
  | PopupSortConfig;

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
  currentState = { config: null };
  emit();
}

export function subscribePopup(listener: PopupListener) {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}
