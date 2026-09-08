export function getUnconsumedKeyboardOverlap(
  hostWindowBottom: number,
  keyboardScreenTop: number,
  windowTopInset = 0,
) {
  if (
    !Number.isFinite(hostWindowBottom) ||
    !Number.isFinite(keyboardScreenTop) ||
    !Number.isFinite(windowTopInset)
  ) {
    return 0;
  }

  // Android measureInWindow excludes the top system inset; keyboard screenY includes it.
  return Math.max(0, Math.ceil(hostWindowBottom + windowTopInset - keyboardScreenTop));
}

export function getAndroidToastBottom(
  keyboardOverlap: number,
  bottomInset: number,
  spacing: number,
) {
  return Math.max(keyboardOverlap + spacing, bottomInset);
}
