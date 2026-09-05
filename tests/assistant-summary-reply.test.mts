import assert from "node:assert/strict";
import test from "node:test";
import { shouldOpenAssistantSummary } from "../src/utils/assistantSummaryReply.ts";

test("only an explicit whole-message acknowledgment opens the summary", () => {
  for (const value of ["Sí", "Sí, por favor!", "Ver resumen", "  OK.  "]) {
    assert.equal(shouldOpenAssistantSummary(value), true, value);
  }
});

test("corrections, negations, and mixed instructions reach the assistant", () => {
  for (const value of [
    "Necesito 3 llantas", "Sin envío, solo retiro", "No quiero ver resumen",
    "Sí, pero cambia la cantidad a 3", "Ver resumen después de cambiar a dólares", "",
  ]) {
    assert.equal(shouldOpenAssistantSummary(value), false, value);
  }
});
