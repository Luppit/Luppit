import assert from "node:assert/strict";
import test from "node:test";

import { getChatKeyboardPadding } from "../src/components/inputChat/keyboard.ts";

test("keeps a full-screen chat above the complete Android IME", () => {
  assert.equal(getChatKeyboardPadding(924, 924, 336), 336);
  assert.equal(getChatKeyboardPadding(924, 924, 424), 424);
});

test("does not count native resize or excluded navigation space twice", () => {
  assert.deepEqual(
    [924, 900, 876, 760, 620, 588, 580].map((bottom) =>
      getChatKeyboardPadding(bottom, 924, 336),
    ),
    [336, 312, 288, 172, 32, 0, 0],
  );
});

test("handles an inset modal viewport in the same screen coordinates", () => {
  const modalTop = 100;
  const modalHeight = 700;
  assert.equal(getChatKeyboardPadding(modalTop + modalHeight, 924, 336), 212);
});

test("releases the chat when the keyboard closes or has no docked inset", () => {
  assert.equal(getChatKeyboardPadding(924, 924, 0), 0);
  assert.equal(getChatKeyboardPadding(924, 924, -24), 0);
});

test("updates for keyboard height and orientation changes without a saved initial height", () => {
  assert.deepEqual(
    [336, 424, 260, 0].map((height) => getChatKeyboardPadding(924, 924, height)),
    [336, 424, 260, 0],
  );
  assert.equal(getChatKeyboardPadding(412, 412, 200), 200);
});

test("rounds fractional viewport overlap up without clipping the footer", () => {
  const viewportBottom = 923.4285888671875;
  const keyboardTop = 923.4285714285714 - 336;
  const padding = getChatKeyboardPadding(viewportBottom, 923.4285714285714, 336);
  assert.ok(viewportBottom - padding <= keyboardTop);
  assert.ok(keyboardTop - (viewportBottom - padding) < 1);
});

test("ignores invalid frame measurements", () => {
  assert.equal(getChatKeyboardPadding(Number.NaN, 924, 336), 0);
  assert.equal(getChatKeyboardPadding(924, Number.POSITIVE_INFINITY, 336), 0);
  assert.equal(getChatKeyboardPadding(924, 924, Number.NaN), 0);
});
