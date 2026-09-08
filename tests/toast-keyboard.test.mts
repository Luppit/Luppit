import assert from "node:assert/strict";
import test from "node:test";

import {
  getAndroidToastBottom,
  getUnconsumedKeyboardOverlap,
} from "../src/components/toast/keyboard.ts";

test("does not add an Android keyboard offset after the root resized", () => {
  assert.equal(getUnconsumedKeyboardOverlap(520, 520), 0);
  assert.equal(getUnconsumedKeyboardOverlap(500, 520), 0);
});

test("returns only the Android keyboard overlap left below the host", () => {
  assert.equal(getUnconsumedKeyboardOverlap(800, 520), 280);
  assert.equal(getUnconsumedKeyboardOverlap(600.2, 520), 81);
});

test("ignores invalid keyboard measurements", () => {
  assert.equal(getUnconsumedKeyboardOverlap(Number.NaN, 520), 0);
  assert.equal(getUnconsumedKeyboardOverlap(800, Number.POSITIVE_INFINITY), 0);
  assert.equal(getUnconsumedKeyboardOverlap(800, 520, Number.NaN), 0);
});

test("converts Android window measurements to the keyboard screen coordinates", () => {
  // An edge-to-edge host at screen y=0 is measured at -54 in window coordinates.
  assert.equal(getUnconsumedKeyboardOverlap(-54 + 924, 588, 54), 336);
  assert.equal(getUnconsumedKeyboardOverlap(-28 + 854, 496, 28), 358);
});

test("does not count the top inset twice after the host has resized above the IME", () => {
  assert.equal(getUnconsumedKeyboardOverlap(-54 + 588, 588, 54), 0);
  assert.equal(getUnconsumedKeyboardOverlap(-28 + 480, 496, 28), 0);
});

test("does not count navigation insets again when the host already excludes them", () => {
  for (const navigationInset of [24, 48]) {
    const keyboardTop = 588;
    // The host may include or exclude the bottom system bar. Measure it as laid out.
    const hostScreenBottom = 924 - navigationInset;
    const overlap = getUnconsumedKeyboardOverlap(hostScreenBottom - 54, keyboardTop, 54);

    assert.equal(hostScreenBottom - overlap, keyboardTop);
  }
});

test("consumes only the remaining overlap as the root resizes during a keyboard transition", () => {
  const hostBottoms = [924, 760, 620, 588, 580];
  assert.deepEqual(
    hostBottoms.map((bottom) => getUnconsumedKeyboardOverlap(bottom - 54, 588, 54)),
    [336, 172, 32, 0, 0],
  );
});

test("recomputes the overlap for a different keyboard height", () => {
  assert.equal(getUnconsumedKeyboardOverlap(870, 588, 54), 336);
  assert.equal(getUnconsumedKeyboardOverlap(870, 500, 54), 424);
});

test("rounds fractional measurements upward to keep all bottom padding visible", () => {
  const hostScreenBottom = 923.4285888671875;
  const keyboardTop = 587.047607421875;
  const overlap = getUnconsumedKeyboardOverlap(
    -54.09521484375 + hostScreenBottom,
    keyboardTop,
    54.095237731933594,
  );
  const clearance = keyboardTop - (hostScreenBottom - overlap - 8);
  assert.ok(clearance >= 8 && clearance < 9);
});

test("uses only keyboard spacing when the IME covers the bottom navigation", () => {
  assert.equal(getAndroidToastBottom(336, 96, 8), 344);
});

test("keeps clearance for navigation that remains visible above a resized host", () => {
  assert.equal(getAndroidToastBottom(0, 96, 8), 96);
  assert.equal(getAndroidToastBottom(40, 96, 8), 96);
});

test("keeps ordinary keyboard spacing when the root fully consumes the keyboard", () => {
  assert.equal(getAndroidToastBottom(0, 0, 8), 8);
  assert.equal(getAndroidToastBottom(336, 0, 8), 344);
});
