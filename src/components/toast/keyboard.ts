export function getUnconsumedKeyboardOverlap(
  hostBottom: number,
  keyboardTop: number,
) {
  if (!Number.isFinite(hostBottom) || !Number.isFinite(keyboardTop)) return 0;

  return Math.max(0, Math.ceil(hostBottom - keyboardTop));
}
