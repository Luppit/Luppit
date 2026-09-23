import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function fixture(offers: { conversationId: string; description: string; priceSummary: string | null }[]) {
  const routes: any[] = [];
  let seedCalls = 0;
  const modules: Record<string, any> = {
    "expo-router": { router: { push: (route: any) => routes.push(route) } },
    "../../services/seller.request.offers.service": {
      getCurrentSellerRequestOfferConversations: async () => ({ ok: true, data: offers }),
      getOrCreateCurrentSellerOfferSeedConversation: async () => {
        seedCalls += 1;
        return { ok: true, data: { id: "new-seed" } };
      },
    },
    "../../utils/useToast": { showError: () => assert.fail("Unexpected error") },
  };
  const source = readFileSync(new URL("../src/components/marketplaceHub/openSellerRequest.ts", import.meta.url).pathname, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, any> = {};
  runInNewContext(compiled, { exports, require: (name: string) => {
    assert.ok(name in modules, `Unmocked import: ${name}`);
    return modules[name];
  } });
  return { open: exports.openSellerRequest as (item: any) => Promise<void>, routes,
    get seedCalls() { return seedCalls; } };
}

const item = { id: "request-1", title: "Llantas", status: "active", navigation: null };

test("one seller request opens its empty conversation before any offer", async () => {
  const f = fixture([]);
  await f.open(item);
  assert.equal(f.seedCalls, 1);
  assert.equal(f.routes[0].params.conversationId, "new-seed");
});

test("one published offer opens the seller request detail", async () => {
  const f = fixture([{ conversationId: "michelin-chat", description: "Michelin", priceSummary: "₡100" }]);
  await f.open(item);
  assert.equal(f.routes.length, 1);
  assert.equal(f.routes[0].pathname, "/(detail)/seller-request-offers");
  assert.equal(f.routes[0].params.purchaseRequestId, item.id);
  assert.equal(f.seedCalls, 0);
});

test("multiple offers still open one request detail", async () => {
  const f = fixture([
    { conversationId: "michelin-chat", description: "Michelin", priceSummary: "₡100" },
    { conversationId: "other-chat", description: "Otra marca", priceSummary: "₡70" },
  ]);
  await f.open(item);
  assert.equal(f.routes.length, 1);
  assert.equal(f.routes[0].pathname, "/(detail)/seller-request-offers");
  assert.equal(f.seedCalls, 0);
});

test("inactive request with one offer still opens its request detail", async () => {
  const f = fixture([{ conversationId: "michelin-chat", description: "Michelin", priceSummary: "₡100" }]);
  await f.open({ ...item, status: "closed" });
  assert.equal(f.routes[0].pathname, "/(detail)/seller-request-offers");
});
