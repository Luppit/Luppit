type PurchaseRequestReadiness = {
  status: string | null;
  isReadyToPublish: boolean;
  missingFields: readonly string[];
};

export function isPurchaseRequestReadyToPublish(state: PurchaseRequestReadiness) {
  return state.status === "ready" &&
    state.isReadyToPublish &&
    state.missingFields.length === 0;
}
