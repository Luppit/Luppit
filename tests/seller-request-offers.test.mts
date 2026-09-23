import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function fixture(offers: { conversationId: string; description: string; priceSummary: string | null }[]) {
  const routes: any[] = [];
  let popup: any = null;
  let seedCalls = 0;
  const modules: Record<string, any> = {
    "expo-router": { router: { push: (route: any) => routes.push(route) } },
    "../../services/popup.service": { openPopup: (value: any) => { popup = value; } },
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
    get popup() { return popup; }, get seedCalls() { return seedCalls; } };
}

const item = { id: "request-1", title: "Llantas", status: "active", navigation: null };

test("one seller request opens its empty conversation before any offer", async () => {
  const f = fixture([]);
  await f.open(item);
  assert.equal(f.seedCalls, 1);
  assert.equal(f.routes[0].params.conversationId, "new-seed");
});

test("one published offer offers its chat and another single-offer draft", async () => {
  const f = fixture([{ conversationId: "michelin-chat", description: "Michelin", priceSummary: "₡100" }]);
  await f.open(item);
  assert.equal(f.routes.length, 0);
  assert.equal(f.popup.options.length, 2);
  f.popup.options[0].onPress();
  assert.equal(f.routes[0].params.conversationId, "michelin-chat");
  f.popup.options[1].onPress();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(f.routes[1].pathname, "/(modal)/offer");
  assert.equal(f.routes[1].params.mode, "create");
  assert.equal(f.routes[1].params.conversationId, "new-seed");
});

test("multiple offers show every chat and an action to add another", async () => {
  const f = fixture([
    { conversationId: "michelin-chat", description: "Michelin", priceSummary: "₡100" },
    { conversationId: "other-chat", description: "Otra marca", priceSummary: "₡70" },
  ]);
  await f.open(item);
  assert.equal(f.routes.length, 0);
  assert.equal(f.popup.options.length, 3);
  f.popup.options[1].onPress();
  assert.equal(f.routes[0].params.conversationId, "other-chat");
  f.popup.options[2].onPress();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(f.routes[1].params.conversationId, "new-seed");
  assert.equal(f.routes[1].params.mode, "create");
});

test("inactive request with one offer still opens its existing chat", async () => {
  const f = fixture([{ conversationId: "michelin-chat", description: "Michelin", priceSummary: "₡100" }]);
  await f.open({ ...item, status: "closed" });
  assert.equal(f.popup, null);
  assert.equal(f.routes[0].params.conversationId, "michelin-chat");
});
