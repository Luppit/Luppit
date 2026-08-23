const PUBLIC_APP_ORIGIN = "https://luppit.com";

export function buildPurchaseRequestUrl(purchaseRequestId: string) {
  return `${PUBLIC_APP_ORIGIN}/request/${encodeURIComponent(purchaseRequestId)}`;
}
