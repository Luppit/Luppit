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
  onValueChange?: (value: string) => void;
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

export type PopupConfig = PopupMenuConfig | PopupSummaryConfig;

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
