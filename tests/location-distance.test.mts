import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function serviceFixture(file: string, payload: unknown) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const modules: Record<string, unknown> = {
    "../db/functions": { RPC_FUNCTIONS: { GET_BUYER_PURCHASE_REQUEST_OFFERS: "buyer_offers", GET_SELLER_MARKETPLACE_HUB_ITEMS: "seller_requests" } },
    "../db/tables": {},
    "../lib/supabase": { getSession: async () => ({ user: { id: "user" } }) },
    "../lib/supabase/client": { supabase: { rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { data: payload, error: null }; } } },
    "../lib/supabase/errors": {},
    "../lib/supabase/storage": {},
    "./profile.business.service": {},
    "./active.profile.service": { getCurrentProfileResult: async () => ({ ok: true, data: { id: "profile" } }) },
    "./segment.service": { ALL_SEGMENTS_SVG_NAME: "todas" },
    "./buyer.home.filters.service": {},
    "./seller.home.filters.service": {},
    "../utils/conversationOfferPrice": { normalizePurchaseOfferPricing: () => ({}) },
  };
  const exports: Record<string, any> = {};
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    require(name: string) { assert.ok(name in modules, `Unmocked import: ${name}`); return modules[name]; },
  });
  return { exports, calls };
}

test("buyer distance sort stays on the RPC and preserves zero, unavailable and server labels", async () => {
  const f = serviceFixture("../src/services/purchase.offer.service.ts", [
    { id: "same-district", distance_km: 0, distance_label: "Aprox. 0 km" },
    { id: "near", distance_km: 4.2, distance_label: "Aprox. 4,2 km" },
    { id: "unknown", distance_km: null, distance_label: null },
  ]);
  const result = await f.exports.getCurrentBuyerPurchaseRequestOffers("request", undefined, "distance_nearest");
  assert.equal(f.calls[0].args.p_sort_code, "distance_nearest");
  assert.equal(f.calls[0].args.p_profile_id, "profile");
  assert.equal(result.ok, true);
  assert.deepEqual(Array.from(result.data, (row: any) => row.id), ["same-district", "near", "unknown"]);
  assert.equal(result.data[0].distance_km, 0);
  assert.equal(result.data[1].distance_label, "Aprox. 4,2 km");
  assert.equal(result.data[2].distance_km, null);
  assert.equal(result.data[2].distance_label, null);
});

test("seller request parsing retains distance estimates without inventing unknown distances", async () => {
  const base = { status: "active", created_at: "2026-10-30T12:00:00Z" };
  const f = serviceFixture("../src/services/purchase.request.service.ts", {
    items: [
      { ...base, id: "near", distance_km: 2.8, distance_label: "Aprox. 2,8 km" },
      { ...base, id: "legacy" },
      { ...base, id: "invalid", distance_km: Infinity, distance_label: "" },
    ],
    total: 3, page: 1, page_size: 20, has_more: false,
    sort: { default_code: "recommended", selected_code: "distance_nearest", options: [{ code: "recommended", label: "Recomendadas", sort_order: 10 }, { code: "distance_nearest", label: "Más cercanas", sort_order: 40 }] },
  });
  const result = await f.exports.getCurrentSellerMarketplaceHubItems(undefined, "todas", "for_you", 1, 20, "distance_nearest");
  assert.equal(f.calls[0].args.p_sort_code, "distance_nearest");
  assert.equal(result.ok, true);
  assert.equal(result.data.sort.selected_code, "distance_nearest");
  assert.equal(result.data.items[0].distance_km, 2.8);
  assert.equal(result.data.items[0].distance_label, "Aprox. 2,8 km");
  assert.equal(result.data.items[1].distance_km, null);
  assert.equal(result.data.items[1].distance_label, null);
  assert.equal(result.data.items[2].distance_km, null);
  assert.equal(result.data.items[2].distance_label, null);
});
