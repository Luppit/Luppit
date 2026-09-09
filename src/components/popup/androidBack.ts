import type { PopupSummaryAction, PopupSummaryConfig } from "@/src/services/popup.service";

type PopupBackAction =
  | { type: "blocked" }
  | { type: "close" }
  | { type: "action"; action: PopupSummaryAction };

export function resolveAndroidPopupBack(
  summary: PopupSummaryConfig | null,
  canDismiss: boolean,
  pending: boolean
): PopupBackAction {
  if (pending) return { type: "blocked" };
  if (summary?.androidBackActionId !== undefined) {
    const action = summary.actions?.slice(0, 2).find(
      (candidate) => candidate.id === summary.androidBackActionId
    );
    return action && !action.disabled
      ? { type: "action", action }
      : { type: "blocked" };
  }
  return summary?.showCloseButton || canDismiss
    ? { type: "close" }
    : { type: "blocked" };
}
