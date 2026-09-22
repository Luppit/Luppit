import assert from "node:assert/strict";
import test from "node:test";
import { getConversationActionsMenuLayout } from "../src/components/conversation/actionsMenuLayout.ts";

const defaults = {
  anchor: { x: 16, y: 130, width: 132, height: 48 },
  width: 390,
  height: 844,
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
  margin: 16,
  gap: 8,
};

test("actions-only header keeps the entire menu inside the left edge", () => {
  const layout = getConversationActionsMenuLayout(defaults);
  assert.equal(layout.left, 16);
  assert.equal(layout.width, 280);
  assert.equal(layout.top, 186);
});

test("two-bubble header preserves right alignment when it fits", () => {
  const layout = getConversationActionsMenuLayout({
    ...defaults,
    anchor: { ...defaults.anchor, x: 242 },
  });
  assert.equal(layout.left + layout.width, 374);
});

test("right-edge anchors stay inside the safe area", () => {
  const layout = getConversationActionsMenuLayout({
    ...defaults,
    anchor: { ...defaults.anchor, x: 280 },
    insets: { ...defaults.insets, right: 24 },
  });
  assert.equal(layout.left + layout.width, 350);
});

test("narrow screens and wrapped controls keep a scrollable menu inside every safe edge", () => {
  for (const width of [240, 280, 320, 359, 360, 390, 430, 844]) {
    for (const x of [16, width - 148, width - 60]) {
      for (const y of [130, 194, 700]) {
        const options = {
          ...defaults,
          width,
          anchor: { x, y, width: 132, height: 72 },
          insets: { top: 47, right: 24, bottom: 34, left: 24 },
        };
        const layout = getConversationActionsMenuLayout(options);
        assert.ok(layout.left >= 40);
        assert.ok(layout.left + layout.width <= width - 40);
        assert.ok(layout.width > 0 && layout.width <= 280);
        assert.ok(layout.top >= 63);
        assert.ok(layout.maxHeight >= 56);
        assert.equal(layout.top + layout.maxHeight, 794);
      }
    }
  }
});

test("short viewports reserve visible scrolling space instead of overflowing below", () => {
  const layout = getConversationActionsMenuLayout({
    ...defaults,
    height: 320,
    anchor: { ...defaults.anchor, y: 240 },
  });
  assert.equal(layout.top, 214);
  assert.equal(layout.maxHeight, 56);
  assert.equal(layout.top + layout.maxHeight, 270);
});
