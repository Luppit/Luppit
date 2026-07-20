import { LucideIconName } from "@/src/icons/lucide";
import type { ToastVariant } from "@/src/services/toast.service";
import type { Theme } from "@/src/themes";

export type ToastVariantPresentation = {
  icon: LucideIconName;
  iconColor: string;
  badgeColor: string;
};

export function getToastVariantPresentation(
  variant: ToastVariant,
  colors: Theme["colors"]
): ToastVariantPresentation {
  switch (variant) {
    case "success":
      return {
        icon: "check",
        iconColor: colors.success,
        badgeColor: "rgba(131,163,30,0.14)",
      };
    case "error":
      return {
        icon: "alert-circle",
        iconColor: colors.error,
        badgeColor: "rgba(165,33,0,0.12)",
      };
    case "warning":
      return {
        icon: "alert-circle",
        iconColor: colors.secondary,
        badgeColor: "rgba(255,200,97,0.22)",
      };
    case "info":
      return {
        icon: "info",
        iconColor: colors.textMedium,
        badgeColor: "rgba(119,190,240,0.18)",
      };
  }
}
