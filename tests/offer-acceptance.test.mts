import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as pricing from "../src/utils/conversationOfferPrice.ts";

function load(path: string, modules: Record<string, any>) {
  const exports: Record<string, any> = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, { exports, require: (name: string) => modules[name] ??
    (name === "@react-navigation/native" ? { useIsFocused: () => true } : {}) });
  return exports;
}
const summary = load("../src/utils/conversationOfferSummary.ts", { "./conversationOfferPrice": pricing });
const { buildOfferAcceptancePresentation: build, getOfferAcceptanceTotal: total } = summary;
const priceField = { label: "Precio", value: "Published fallback, including every charge" };
const context = {
  offer_price_amount: 45_000, offer_price_basis: "UNIT", offer_quantity_offered: 4,
  offer_product_subtotal: 180_000, offer_subtotal: 190_000, offer_currency_code: "COL",
  offer_unit_label: "llanta", pricing_version: 2,
  offer_components: [{ id: "extra", description: "Tramado del vehículo", charge_mode: "EXTRA",
    amount: 10_000, basis: "TOTAL", quantity: 1, unit_label: "conjunto" }],
};
const input = { id: "delivery", kind: "choice", payload_key: "fulfillment_catalog_id", label: "Método de entrega", options: [
  { value: "pickup", label: "Recoger", totalLabel: "Total: COL 190000" },
  { value: "ship", label: "Envío", totalLabel: "Total: COL 198500.25" },
  { value: "unknown", label: "Envío por coordinar", totalLabel: null },
  { value: "blocked", label: "No disponible", disabled: true, totalLabel: "Total: COL 1" },
] };

test("acceptance shows canonical server totals and independent extra scope without copying pending terms", () => {
  const result = build({ ...context, offer_proposal: { proposed_terms: { price: 1 } }, notes: "Private" }, priceField);
  assert.equal(result.rows[0].value, "₡180,000");
  assert.equal(result.rows[0].detail, "4 × ₡45,000 por llanta");
  assert.equal(result.rows[1].label, "Tramado del vehículo");
  assert.equal(result.rows[1].detail, "Por el conjunto");
  assert.equal(result.rows[1].value, "₡10,000");
  assert.equal(result.subtotal.value, "₡190,000");
  assert.ok(!JSON.stringify(result).includes("Private"));
});
test("arbitrary fractional units, unit-based extras and included concepts preserve the server quote", () => {
  const result = build({ ...context, offer_price_amount: 12.5, offer_quantity_offered: 2.5,
    offer_product_subtotal: 31.25, offer_subtotal: 48.75, offer_currency_code: "USD", offer_unit_label: "kg",
    offer_components: [
      { id: "labor", description: "Corte", charge_mode: "EXTRA", amount: 7, basis: "UNIT", quantity: 2.5, unit_label: "hora" },
      { id: "wrap", description: "Embalaje", charge_mode: "INCLUDED" },
    ] }, priceField);
  assert.equal(result.rows[0].detail, "2.5 × $12.50 por kg");
  assert.equal(result.rows[1].detail, "$7 por hora × 2.5");
  assert.equal(result.rows[1].value, undefined);
  assert.equal(result.rows[2].value, "Incluido");
  assert.equal(result.subtotal.value, "$48.75");
});
test("a package without extras needs no fabricated quantity or services", () => {
  const result = build({ offer_price_amount: 120, offer_price_basis: "TOTAL", offer_currency_code: "USD" }, priceField);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].detail, "Por el conjunto");
  assert.equal(result.rows[0].value, "$120");
  assert.equal(result.subtotal.value, "$120");
});
test("incomplete structured pricing preserves the entire confirmation price instead of presenting a partial total", () => {
  for (const incomplete of [{}, { ...context, offer_subtotal: null }, { ...context, offer_price_basis: null }]) {
    const result = build(incomplete, priceField);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].detail, priceField.value);
    assert.equal(result.subtotal, undefined);
  }
});
test("delivery selection displays the returned total once without adding a shipping fee locally", () => {
  const presentation = { ...build(context, priceField), fulfillmentInputId: input.id };
  assert.equal(total(presentation, [input], {}).label, "Subtotal de la oferta");
  assert.equal(total(presentation, [input], { delivery: "pickup" }).value, "₡190,000");
  assert.equal(total(presentation, [input], { delivery: "ship" }).value, "₡198,500.25");
  assert.equal(total(presentation, [input], { delivery: "unknown" }).value, "Por confirmar");
  assert.equal(total(presentation, [input], { delivery: "blocked" }).label, "Subtotal de la oferta");
  assert.equal(total(presentation, [input], { delivery: "stale" }).value, "₡190,000");
  assert.equal(total(presentation, [{ ...input, options: [{ value: "custom", totalLabel: "Total pendiente de confirmación" }] }], { delivery: "custom" }).value, "Total pendiente de confirmación");
});

function hookHarness() {
  let popup: any;
  const calls: any[] = [];
  const refreshes: any[] = [];
  const { useConversationActions } = load("../src/components/conversation/useConversationActions.ts", {
    react: { useState: (initial: any) => [initial, () => {}], useRef: (initial: any) => ({ current: initial }),
      useCallback: (fn: any) => fn, useEffect: () => {} },
    "@/src/icons/lucide": { lucideIcons: { check: {}, "arrow-left": {} } },
    "@/src/services/popup.service": { openPopup: (config: any) => { popup = config; }, closePopup: () => {} },
    "@/src/services/conversation.service": { executeConversationActionByExecutor: async (request: any) => { calls.push(request); return { ok: true, data: null }; } },
    "@/src/utils/conversationOfferSummary": summary,
    "@/src/utils/useToast": { showError: () => {}, showInfo: () => {}, showSuccess: () => {}, showWarning: () => {} },
  });
  const action = {
    id: "accept", code: "BUYER_ACCEPT_OFFER", label: "Aceptar", style_code: "primary",
    executor: { execution_type: "server_rpc", target: "public.buyer_accept_offer", requires_refresh: true },
    confirmation: {
      code: "BUYER_ACCEPT_OFFER_CONFIRMATION", title: "Aceptar", description_template: "", cancel_label: "Volver", confirm_label: "Aceptar", confirm_style_code: "primary",
      fields: [
        { label: "Oferta", value_source: "offer_name", value: "Published name" },
        { label: "Descripción", value_source: "offer_description", value: "Exact published description" },
        { ...priceField, value_source: "offer_price" },
        { label: "Other DB field", value_source: "other", value: "Keep me" },
      ],
      inputs: [{ ...input, is_required: true, helper_text: "DB helper", component_config: { presentation: "inline_compact" } }],
      payload_defaults: { offer_revision: "published-revision" }, blocker: null,
    },
  };
  const open = (candidate = action) => {
    useConversationActions({ conversationId: "conversation", profileId: "buyer", conversationView: {
      context, conversation: { purchase_request_id: "request" }, role_code: "BUYER", actions: [candidate],
    }, refreshConversation: async () => { refreshes.push(true); } }).handleActionPress(candidate);
    return popup;
  };
  return { action, open, calls, refreshes };
}
test("acceptance wiring keeps DB fields, delivery requirements, revision and executor, with no mutation on opening", async () => {
  const h = hookHarness();
  const popup = h.open();
  assert.equal(popup.offerAcceptance.fulfillmentInputId, "delivery");
  assert.equal(popup.metadata, "Published name");
  assert.equal(popup.description, "Exact published description");
  assert.equal(popup.descriptionPlacement, "afterRows");
  assert.equal(popup.rows.length, 1);
  assert.equal(popup.rows[0].value, "Keep me");
  assert.equal(popup.inputs[0].helper_text, "DB helper");
  assert.equal(h.calls.length, 0);
  const missing = popup.actions[1].onPress();
  assert.equal(missing.shouldClose, false);
  assert.equal(h.calls.length, 0);
  popup.inputs[0].onValueChange("blocked");
  assert.equal(popup.actions[1].onPress().shouldClose, false);
  assert.equal(h.calls.length, 0);
  popup.inputs[0].onValueChange("pickup");
  await popup.actions[1].onPress();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].payload.offer_revision, "published-revision");
  assert.equal(h.calls[0].payload.fulfillment_catalog_id, "pickup");
  assert.equal(h.calls[0].executor.target, "public.buyer_accept_offer");
});
test("proposal review and other confirmations retain their existing presentation", () => {
  const h = hookHarness();
  const popup = h.open({ ...h.action, confirmation: { ...h.action.confirmation, code: "REVIEW_PROPOSAL" } });
  assert.equal(popup.offerAcceptance, undefined);
  assert.equal(popup.rows.length, h.action.confirmation.fields.length);
});
