import { createKVStorage } from "@/src/store/factory";

const storage = createKVStorage();
const PENDING_SHARED_PURCHASE_REQUEST_KEY = "pending_shared_purchase_request_id";

function normalizePurchaseRequestId(purchaseRequestId: string | null | undefined) {
  const normalized = purchaseRequestId?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export async function setPendingSharedPurchaseRequest(
  purchaseRequestId: string
): Promise<boolean> {
  const normalized = normalizePurchaseRequestId(purchaseRequestId);
  if (!normalized) return false;

  await storage.setItem(PENDING_SHARED_PURCHASE_REQUEST_KEY, normalized);
  return true;
}

export async function getPendingSharedPurchaseRequest(): Promise<string | null> {
  return normalizePurchaseRequestId(
    await storage.getItem(PENDING_SHARED_PURCHASE_REQUEST_KEY)
  );
}

export async function consumePendingSharedPurchaseRequest(): Promise<string | null> {
  const purchaseRequestId = await getPendingSharedPurchaseRequest();
  if (purchaseRequestId) {
    await storage.removeItem(PENDING_SHARED_PURCHASE_REQUEST_KEY);
  }
  return purchaseRequestId;
}
