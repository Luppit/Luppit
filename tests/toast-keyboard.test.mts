import assert from "node:assert/strict";
import test from "node:test";

import { getUnconsumedKeyboardOverlap } from "../src/components/toast/keyboard.ts";

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
});
