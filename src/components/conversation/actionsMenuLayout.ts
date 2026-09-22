type MenuAnchor = { x: number; y: number; width: number; height: number };

export function getConversationActionsMenuLayout({
  anchor,
  width,
  height,
  insets,
  margin,
  gap,
}: {
  anchor: MenuAnchor;
  width: number;
  height: number;
  insets: { top: number; right: number; bottom: number; left: number };
  margin: number;
  gap: number;
}) {
  const minLeft = insets.left + margin;
  const maxRight = width - insets.right - margin;
  const menuWidth = Math.max(0, Math.min(280, maxRight - minLeft));
  const minTop = insets.top + margin;
  const maxBottom = height - insets.bottom - margin;
  const top = Math.max(
    minTop,
    Math.min(anchor.y + anchor.height + gap, maxBottom - 56),
  );

  return {
    left: Math.max(
      minLeft,
      Math.min(anchor.x + anchor.width - menuWidth, maxRight - menuWidth),
    ),
    top,
    width: menuWidth,
    maxHeight: Math.max(0, maxBottom - top),
  };
}
