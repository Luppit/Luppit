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
  assert.equal(summary.rows[3].label, "Envío");
  assert.equal(
    summary.rows[3].value,
    "Costo de envío no especificado\nCoordinar entrega",
  );
  assert.equal(summary.rows[4].label, "Retiro en tienda · Seleccionado");
  assert.equal(summary.rows[4].value, "Disponible en 2 días\nTotal: ₡160,000");
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
    "Costo de envío: ₡0\nEntrega: hasta 3 día(s) desde el envío.",
  );
  assert.equal(
    summary.rows[4].value,
    "Retiro: 0 día(s) desde la confirmación del vendedor.",
  );
});

const serviceSource = readFileSync(
  new URL("../src/services/conversation.service.ts", import.meta.url),
  "utf8",
);
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
