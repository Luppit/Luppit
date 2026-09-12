import assert from "node:assert/strict";
import test from "node:test";
import {
  isAssistantReviewInstruction,
  getVisibleSellerOfferMessages,
  isSellerOfferReviewInstruction,
  isSellerOfferSummaryReply,
  shouldOpenAssistantSummary,
} from "../src/utils/assistantSummaryReply.ts";

test("only an explicit whole-message acknowledgment opens the summary", () => {
  for (const value of ["Sí", "Sí, por favor!", "Ver resumen", "  OK.  "]) {
    assert.equal(shouldOpenAssistantSummary(value), true, value);
  }
});

test("seller filtering hides only exact control copy and keeps the source transcript intact", () => {
  const invitation = "Tu oferta está lista. ¿Deseas ver el resumen?";
  const instruction = "Aquí tienes el resumen de la oferta. ¿Deseas enviarla o seguir ajustando?";
  const assistant = (text: string) => ({ sender: "assistant" as const, text });
  const user = (text: string) => ({ sender: "user" as const, text });
  const transcript = [
    assistant(invitation), user("Sí"), assistant(instruction), assistant(invitation),
    user(instruction), assistant(`${instruction} Cambié el precio a ₡55 000.`),
    assistant("Para completar la oferta, necesito confirmar: confirmacion de oferta. ¿Me ayudas con ese dato?"),
    user("Sí"), assistant(invitation),
    { ...user("Sí"), images: ["new-image"] }, assistant(invitation),
  ];
  const original = [...transcript];
  const visible = getVisibleSellerOfferMessages(transcript);
  assert.deepEqual(transcript, original);
  assert.deepEqual(visible, transcript.filter((_, index) => index !== 2 && index !== 3));
  assert.equal(visible[0], transcript[0]);
  assert.equal(isSellerOfferReviewInstruction(`  ${instruction.replace(". ", ".\n")}  `), true);
  assert.equal(isSellerOfferReviewInstruction(`${instruction} Falta una foto.`), false);
});

test("seller explicit summary requests work without treating every ready-draft acknowledgement as review", () => {
  const invitation = { sender: "assistant" as const, text: "Tu oferta está lista. ¿Deseas ver el resumen?" };
  assert.equal(isSellerOfferSummaryReply("Sí", invitation), true);
  assert.equal(isSellerOfferSummaryReply("Sí", undefined), false);
  assert.equal(isSellerOfferSummaryReply("Sí", { ...invitation, sender: "user" }), false);
  assert.equal(isSellerOfferSummaryReply("Sí", { ...invitation, text: "¿Confirmas el plazo?" }), false);
  assert.equal(isSellerOfferSummaryReply("Ver resumen", undefined), true);
  assert.equal(isSellerOfferSummaryReply("Sí, pero cambia el precio", invitation), false);
});

test("corrections, negations, and mixed instructions reach the assistant", () => {
  for (const value of [
    "Necesito 3 llantas", "Sin envío, solo retiro", "No quiero ver resumen",
    "No, suave, quiero que esté barato", "No", "No gracias", "Todavía no",
    "Sí, pero quiero que esté barato", "Sí, quiero ver el resumen pero cambia el precio",
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
