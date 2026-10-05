import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as pricing from "../src/utils/conversationOfferPrice.ts";

function compile(source: string, globals: Record<string, unknown>) {
  const exports: Record<string, any> = {};
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  runInNewContext(outputText, { exports, ...globals });
  return exports;
}
const { buildConversationOfferSummary } = compile(
  readFileSync(
    new URL("../src/utils/conversationOfferSummary.ts", import.meta.url),
    "utf8",
  ),
  { require: () => pricing },
);
const context = {
  offer_name: "4 llantas",
  offer_description: "Incluye alineado gratis.",
  offer_price_amount: 40_000,
  offer_price_basis: "UNIT",
  offer_quantity_offered: 4,
  offer_product_subtotal: 160_000,
  offer_currency_code: "CRC",
};

const complementaryContext = {
  ...context,
  pricing_version: 2,
  offer_unit_label: "llanta",
  offer_subtotal: 165_000,
  offer_components: [
    { id: "alignment", description: "Alineado", charge_mode: "EXTRA", amount: 5_000,
      basis: "TOTAL", quantity: 1, unit_label: "trabajo" },
    { id: "balance", description: "Balanceo", charge_mode: "INCLUDED", amount: null,
      basis: null, quantity: null, unit_label: null },
  ],
};

test("complementary summaries show complete server subtotal and preserve independent scopes", () => {
  const summary = buildConversationOfferSummary(complementaryContext);
  assert.equal(summary.offerVisual.price.value, "₡165,000");
  assert.equal(summary.offerVisual.price.label, "Subtotal de la oferta");
  assert.equal(summary.offerVisual.quantity, "4 × llanta");
  assert.equal(summary.offerVisual.price.detail, "₡40,000 por llanta · 4 × llanta");
  assert.equal(summary.offerVisual.rows[1].label, "Alineado");
  assert.equal(summary.offerVisual.rows[1].value, "₡5,000 · por el conjunto");
  assert.equal(summary.offerVisual.rows[2].value, "Incluido");
  assert.equal(pricing.formatConversationOfferTotal({ ...complementaryContext,
    offer_quantity_offered: 2, offer_product_subtotal: 80_000, offer_subtotal: 85_000 }), "₡85,000");
  assert.equal(pricing.formatConversationOfferTotal({ ...complementaryContext,
    offer_price_basis: "TOTAL", offer_price_amount: 160_000 }), "₡165,000");
});

test("unknown composite subtotal never falls back to the principal amount", () => {
  const pending = { ...complementaryContext, offer_subtotal: null,
    offer_price_basis: "TOTAL", offer_price_amount: 160_000 };
  assert.equal(pricing.formatConversationOfferTotal(pending), null);
  assert.match(pricing.formatConversationOfferPrice(pending)!, /Subtotal pendiente/);
  assert.equal(buildConversationOfferSummary(pending).offerVisual.price, undefined);
});

test("pricing normalization preserves stable identities, included null amounts, and charging units", () => {
  const normalized = pricing.normalizePurchaseOfferPricing(complementaryContext);
  assert.equal(normalized.offer_subtotal, 165_000);
  assert.equal(normalized.offer_unit_label, "llanta");
  assert.equal(normalized.offer_components[0].id, "alignment");
  assert.equal(normalized.offer_components[0].quantity, 1);
  assert.equal(normalized.offer_components[1].amount, null);
  assert.equal(normalized.offer_components[1].charge_mode, "INCLUDED");
});

test("a pending scope is displayed without presenting its amount as a fixed charge", () => {
  const pending = { ...complementaryContext, offer_subtotal: null,
    offer_components: [{ ...complementaryContext.offer_components[0], description: null, basis: null }] };
  const rows = pricing.buildOfferPricingRows(pending);
  assert.equal(rows[1].label, "Concepto pendiente");
  assert.equal(rows[1].value, "₡5,000 · Alcance pendiente");
  assert.match(pricing.formatConversationOfferPrice(pending)!, /Subtotal pendiente/);
  assert.equal(pricing.formatConversationOfferTotal(pending), null);
});

test("the compact price is the product total, not the unit price", () => {
  assert.equal(pricing.formatConversationOfferTotal(context), "₡160,000");
  assert.equal(
    pricing.formatConversationOfferTotal({
      ...context,
      offer_product_subtotal: null,
    }),
    "₡160,000",
  );
  assert.equal(
    pricing.formatConversationOfferTotal({
      ...context,
      offer_product_subtotal: null,
      offer_quantity_offered: null,
    }),
    null,
  );
  assert.equal(
    pricing.formatConversationOfferTotal({
      ...context,
      offer_price_basis: "TOTAL",
      offer_product_subtotal: null,
    }),
    "₡40,000",
  );
  assert.equal(
    pricing.formatConversationOfferTotal({
      ...context,
      offer_currency_code: "USD",
      offer_product_subtotal: 160.25,
    }),
    "$160.25",
  );
  assert.equal(
    pricing.formatConversationOfferTotal({
      ...context,
      offer_product_subtotal: 0,
    }),
    "₡0",
  );
});

test("summary preserves published terms and ignores pending proposals and private notes", () => {
  const summary = buildConversationOfferSummary({
    ...context,
    offer_proposal: { proposed_terms: { price: 1, description: "Unaccepted" } },
    notes: "Private seller note",
  });
  assert.equal(summary.description, context.offer_description);
  assert.equal(summary.offerVisual.title, "4 llantas");
  assert.equal(summary.offerVisual.quantity, "4 unidades");
  assert.equal(summary.offerVisual.price.label, "Total de productos");
  assert.equal(summary.offerVisual.price.value, "₡160,000");
  assert.equal(summary.offerVisual.price.detail, "₡40,000 por unidad · 4 unidades");
  assert.equal(summary.metadata, undefined);
  assert.deepEqual(
    Array.from(summary.rows, (row: any) => ({ ...row })),
    [
      { label: "Cantidad ofrecida", value: "4" },
      { label: "Precio por unidad", value: "₡40,000" },
      { label: "Total de productos", value: "₡160,000" },
    ],
  );
  assert.equal(JSON.stringify(summary).includes("Private"), false);
  assert.equal(JSON.stringify(summary).includes("Unaccepted"), false);
});

test("both delivery methods and supplied costs/timing survive with explicit selected method", () => {
  const summary = buildConversationOfferSummary({
    ...context,
    selected_fulfillment_catalog_id: "pickup",
    fulfillment_options: [
      {
        catalog_id: "ship",
        label: "Envío",
        fee_label: "Costo de envío no especificado",
        timing_label: "Coordinar entrega",
      },
      {
        catalog_id: "pickup",
        label: "Retiro en tienda",
        timing_label: "Disponible en 2 días",
        total_label: "Total: ₡160,000",
      },
    ],
  });
  assert.equal(summary.rows[3].label, "Opciones de entrega");
  assert.equal(
    summary.rows[3].value,
    "• Envío\n  Costo de envío no especificado\n  Coordinar entrega\n" +
      "• Retiro en tienda · Seleccionado\n  Disponible en 2 días\n  Total: ₡160,000",
  );
  assert.equal(summary.rows.length, 4);
  assert.deepEqual(Array.from(summary.offerVisual.deliveryRows, (row: any) => ({ ...row })), [
    { label: "Envío", detail: "Costo de envío no especificado · Coordinar entrega", icon: undefined },
    { label: "Retiro en tienda · Seleccionado", detail: "Disponible en 2 días · Total: ₡160,000", icon: undefined },
  ]);
});

test("delivery options without details appear once under a shared heading", () => {
  const summary = buildConversationOfferSummary({
    ...context,
    fulfillment_options: [
      { catalog_id: "shipping", label: "Envío" },
      { catalog_id: "pickup", label: "Recoger en tienda" },
    ],
  });
  assert.equal(summary.rows[3].label, "Opciones de entrega");
  assert.equal(summary.rows[3].value, "• Envío\n• Recoger en tienda");
  assert.equal(summary.rows.length, 4);
});

test("total pricing and missing optional fields do not invent quantities or delivery promises", () => {
  const summary = buildConversationOfferSummary({
    offer_price_basis: "TOTAL",
    offer_price_amount: 45,
    offer_currency_code: "USD",
    offer_description: "-",
    fulfillment_options: [],
  });
  assert.equal(summary.rows.length, 1);
  assert.equal(summary.rows[0].value, "$45");
  assert.equal(summary.description, undefined);
  assert.equal(summary.offerVisual.price.value, "$45");
  assert.equal(summary.offerVisual.quantity, undefined);
  assert.equal(summary.offerVisual.deliveryRows.length, 0);
});

test("an unknown unit quantity never presents a made-up product total", () => {
  const summary = buildConversationOfferSummary({
    ...context,
    offer_product_subtotal: null,
    offer_quantity_offered: null,
  });
  assert.equal(summary.offerVisual.price.label, "Precio por unidad");
  assert.equal(summary.offerVisual.price.value, "₡40,000");
  assert.equal(summary.offerVisual.quantity, undefined);
});

test("full summary retains stored optional fulfillment details omitted by acceptance choices", () => {
  const summary = buildConversationOfferSummary({
    ...context,
    fulfillment_options: [
      {
        catalog_id: "shipping",
        label: "Envío",
        fee_label: null,
        timing_label: null,
      },
      { catalog_id: "pickup", label: "Retiro en tienda", timing_label: null },
    ],
    offer_fulfillment_details: [
      {
        catalog_id: "shipping",
        method_kind: "shipping",
        shipping_price: 0,
        shipping_max_days: 3,
      },
      { catalog_id: "pickup", method_kind: "pickup", pickup_after_days: 0 },
    ],
  });
  assert.equal(
    summary.rows[3].value,
    "• Envío\n  Costo de envío: ₡0\n  Entrega: hasta 3 día(s) desde el envío.\n" +
      "• Retiro en tienda\n  Retiro: 0 día(s) desde la confirmación del vendedor.",
  );
  assert.equal(summary.rows.length, 4);
});

const serviceSource = readFileSync(
  new URL("../src/services/conversation.service.ts", import.meta.url),
  "utf8",
);
test("deadline slots preserve separate server availability, readable date and explanation without deriving a lifecycle", () => {
  const parseSlot = compile(serviceSource.slice(
    serviceSource.indexOf("function parseNullableNumber("),
    serviceSource.indexOf("function parseConversationPresentation("),
  ) + "\nexports.parseSlot = parseConversationViewSlot;", {}).parseSlot;
  const raw = { code: "deadline", due_at: "2026-10-06T18:54:03.035703Z",
    formatted_due_at: "6 oct 2026 · 12:54 p. m.", section_label: "Fecha límite del retiro",
    availability: { label: "Disponible desde", formatted_at: "3 oct 2026 · 12:54 p. m." },
    deadline_message: "La compra seguirá abierta.", is_overdue: false };
  const parsed = parseSlot(raw);
  assert.equal(parsed.due_at, raw.due_at);
  assert.equal(parsed.formatted_due_at, raw.formatted_due_at);
  assert.equal(parsed.availability.label, raw.availability.label);
  assert.equal(parsed.availability.formatted_at, raw.availability.formatted_at);
  assert.equal(parsed.deadline_message, raw.deadline_message);
  assert.equal(parsed.is_overdue, false);
  assert.equal(parseSlot({ code: "legacy" }).availability, null);
  assert.equal(parseSlot({ code: "bad", availability: { label: "Incomplete" }, deadline_message: 4 }).availability, null);
  assert.equal(parseSlot({ code: "bad", deadline_message: 4 }).deadline_message, null);
});
const parsePresentation = compile(serviceSource.slice(
  serviceSource.indexOf("function parseConversationPresentation("),
  serviceSource.indexOf("function parseConversationView("),
) + "\nexports.parsePresentation = parseConversationPresentation;", {
  toOptionalText: (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null,
}).parsePresentation;

test("conversation stage metadata preserves DB labels, labeled amounts, pause and lock without deriving a state", () => {
  const parsed = parsePresentation({ show_terms: false, show_terms_price: false, locked: true,
    terms_version: "Condiciones acordadas", card: { title: "Cambios pendientes", message: "Esperando al comprador",
      comparison: { current_label: "Acordada", current_value: "₡160.000", proposed_label: "Propuesta", proposed_value: "₡140.000" },
      supporting: { title: "Envío en pausa", message: "No envíes la compra" } } });
  assert.equal(parsed.locked, true);
  assert.equal(parsed.show_terms, false);
  assert.equal(parsed.show_terms_price, false);
  assert.equal(parsed.card.comparison.current_label, "Acordada");
  assert.equal(parsed.card.comparison.proposed_value, "₡140.000");
  assert.equal(parsed.card.supporting.title, "Envío en pausa");
  assert.equal(parsePresentation(null), null);
  assert.equal(parsePresentation({ card: {} }), null);
});
const summaryServiceSource = serviceSource.slice(
  serviceSource.indexOf(
    "export async function getCurrentConversationOfferSummary(",
  ),
  serviceSource.indexOf("function normalizeRpcTarget("),
);
function view(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    profileId: "seller",
    data: {
      conversation: {
        purchase_offer_id: "offer",
        selected_fulfillment_catalog_id: "pickup",
      },
      context: { ...context, offer_revision: "revision-a" },
    },
    ...overrides,
  };
}
function loadService(views: any[], images: any, onImages = () => {}) {
  return compile(summaryServiceSource, {
    getCurrentUserConversationView: async () => views.shift(),
    getPurchaseOfferImagePreviewFiles: async () => {
      onImages();
      return images;
    },
    fromAppError: (type: string) => ({ type }),
  }).getCurrentConversationOfferSummary;
}

test("summary loads photos only after conversation access and checks the same revision afterwards", async () => {
  const getSummary = loadService([view(), view()], {
    ok: true,
    data: [{ uri: "signed-photo" }],
  });
  const result = await getSummary("conversation");
  assert.equal(result.ok, true);
  assert.equal(result.images[0].uri, "signed-photo");
  assert.equal(result.images[0].caption, undefined);
});

test("denied or missing offers never query photos", async () => {
  for (const denied of [
    { ok: false, error: { type: "auth" } },
    view({ data: { conversation: { purchase_offer_id: null } } }),
  ]) {
    let queried = false;
    const result = await loadService([denied], null, () => {
      queried = true;
    })("conversation");
    assert.equal(result.ok, false);
    assert.equal(queried, false);
  }
});

test("concurrent offer, photo revision, selected delivery or active profile changes reject a mixed summary", async () => {
  const changes = [
    view({ profileId: "other-profile" }),
    view({
      data: {
        ...view().data,
        context: { ...context, offer_revision: "revision-b" },
      },
    }),
    view({
      data: {
        ...view().data,
        conversation: { purchase_offer_id: "other-offer" },
      },
    }),
    view({
      data: {
        ...view().data,
        conversation: {
          purchase_offer_id: "offer",
          selected_fulfillment_catalog_id: "ship",
        },
      },
    }),
  ];
  for (const changed of changes) {
    const result = await loadService([view(), changed], { ok: true, data: [] })(
      "conversation",
    );
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "offer_changed");
  }
});
