export function getChatKeyboardPadding(
  viewportScreenBottom: number,
  screenHeight: number,
  keyboardHeight: number,
) {
  "worklet";

  if (
    !Number.isFinite(viewportScreenBottom) ||
    !Number.isFinite(screenHeight) ||
    !Number.isFinite(keyboardHeight) ||
    keyboardHeight <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil(viewportScreenBottom - (screenHeight - keyboardHeight)),
  );
}
