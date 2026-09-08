import assert from "node:assert/strict";
import test from "node:test";
import {
  isAssistantReviewInstruction,
  shouldOpenAssistantSummary,
} from "../src/utils/assistantSummaryReply.ts";

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

test("standalone review instructions are already covered by the review card", () => {
  for (const value of [
    "Listo. Revisa que todo esté correcto antes de publicar.",
    "Aqui tienes el resumen. ¿Deseas publicar o seguir ajustando?",
    "  Aqui tienes el resumen.\n¿Deseas publicar o seguir ajustando?  ",
  ]) {
    assert.equal(isAssistantReviewInstruction(value), true, value);
  }
});

test("review guidance with unique content, missing data, or publication status is preserved", () => {
  for (const value of [
    "Listo. Revisa que todo esté correcto antes de publicar. Cambié la cantidad a 3.",
    "Aqui tienes el resumen. Aun no se puede publicar: faltan datos requeridos.",
    "No puedo publicar todavía porque falta la categoría.",
    "Esta solicitud ya fue publicada.",
    "¿Quieres ver el resumen?",
    "",
  ]) {
    assert.equal(isAssistantReviewInstruction(value), false, value);
  }
});
