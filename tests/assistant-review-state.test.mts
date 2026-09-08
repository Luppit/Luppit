import assert from "node:assert/strict";
import test from "node:test";
import { isPurchaseRequestReadyToPublish } from "../src/utils/purchaseRequestReadiness.ts";
import {
  formatConversationOfferPrice,
  normalizePurchaseOfferPricing,
} from "../src/utils/conversationOfferPrice.ts";

test("a draft summary missing quantity is incomplete", () => {
  assert.equal(isPurchaseRequestReadyToPublish({
    status: "draft",
    isReadyToPublish: false,
    missingFields: ["cantidad"],
  }), false);
});

test("only a consistent backend readiness result enables publication", () => {
  const ready = {
    status: "ready",
    isReadyToPublish: true,
    missingFields: [],
  };
  assert.equal(isPurchaseRequestReadyToPublish(ready), true);
  assert.equal(isPurchaseRequestReadyToPublish({ ...ready, isReadyToPublish: false }), false);
  assert.equal(isPurchaseRequestReadyToPublish({ ...ready, status: "draft" }), false);
  assert.equal(isPurchaseRequestReadyToPublish({ ...ready, status: "published" }), false);
  assert.equal(isPurchaseRequestReadyToPublish({ ...ready, missingFields: ["cantidad"] }), false);
});

test("published pricing uses the DB quantity, unit price, and subtotal summary", () => {
  const summary = "4 × ₡50,000 · Total de productos: ₡200,000";
  assert.equal(formatConversationOfferPrice({
    offer_price_summary: summary,
    offer_price: "₡200,000",
    offer_price_amount: 50000,
    offer_currency_code: "COL",
    offer_price_basis: "UNIT",
    offer_quantity_offered: 4,
    offer_product_subtotal: 200000,
  }), summary);
});

test("published pricing prefers the DB formatted price before a legacy raw amount", () => {
  assert.equal(formatConversationOfferPrice({
    offer_price_summary: " ",
    offer_price: "₡200,000",
    offer_price_amount: 50000,
  }), "₡200,000");
  assert.equal(formatConversationOfferPrice({
    offer_price: "-",
    offer_price_amount: 12.5,
    offer_currency_code: "USD",
  }), "$12.50");
  assert.equal(formatConversationOfferPrice({}), null);
  assert.equal(formatConversationOfferPrice({ offer_price_amount: Number.NaN }), null);
});

test("buyer and seller card pricing preserves the RPC pricing summary", () => {
  const summary = "4 × ₡50,000 · Total de productos: ₡200,000";
  const pricing = normalizePurchaseOfferPricing({
    price_basis: "UNIT",
    quantity_offered: 4,
    offer_product_subtotal: 200000,
    offer_price_summary: summary,
  });
  assert.equal(pricing.quantity_offered, 4);
  assert.equal(pricing.offer_product_subtotal, 200000);
  assert.equal(formatConversationOfferPrice({
    offer_price_amount: 50000,
    offer_price_basis: pricing.price_basis,
    offer_quantity_offered: pricing.quantity_offered,
    offer_currency_code: "COL",
    ...pricing,
  }), summary);
});

test("legacy table cards label unit pricing without inventing a subtotal", () => {
  const unitOffer = {
    offer_price_amount: 50000,
    offer_price_basis: "UNIT",
    offer_quantity_offered: 4,
    offer_currency_code: "COL",
  };
  assert.equal(formatConversationOfferPrice(unitOffer), "₡50,000 por unidad · Cantidad: 4");
  assert.equal(formatConversationOfferPrice({
    ...unitOffer,
    offer_product_subtotal: 200000,
  }), "₡50,000 por unidad · Cantidad: 4 · Total de productos: ₡200,000");
  assert.equal(formatConversationOfferPrice({
    offer_price_amount: 180000,
    offer_price_basis: "TOTAL",
    offer_quantity_offered: 4,
  }), "Total de productos: ₡180,000");
  assert.equal(formatConversationOfferPrice({ offer_price_amount: null }), null);
});
