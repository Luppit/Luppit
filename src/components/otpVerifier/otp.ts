export const normalizeOtpValue = (value: string, length: number) =>
  value.replace(/\D/g, "").slice(0, Math.max(0, length));
