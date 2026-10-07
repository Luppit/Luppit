import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";

const ts = createRequire(import.meta.url)("typescript");
const discardAction = {
  id: "bulk", label: "Descartar todas", icon: "trash-2", style_code: "error",
  executor: { target: "public.seller_discard_request_offers" },
  confirmation: { title: "¿Descartar todas?", description_template: "DB confirmation",
    fields: [{ label: "Disponibles", value: "2" }, { label: "Se conservarán", value: "1" }],
    cancel_label: "Volver", cancel_icon: "arrow-left", confirm_label: "Descartar",
    confirm_icon: "trash-2", confirm_style_code: "error" },
};

function screenFixture() {
  const states: any[] = [];
  const refs: any[] = [];
  const effects: { deps: any[]; cleanup?: () => void }[] = [];
  let stateIndex = 0;
  let refIndex = 0;
  let effectIndex = 0;
  let queuedEffects: (() => void)[] = [];
  let menu: any;
  let popup: any;
  let offerLoads = 0;
  let discardCalls = 0;
  let favoriteCalls = 0;
  let menuActions: any[] = [
    { id: "favorite", label: "DB favorite", executor: { target: "request.favorite.add" } },
    { id: "category", label: "DB category", executor: { target: "request.category" } },
    discardAction,
  ];
  let discard: () => Promise<any> = async () => ({ ok: true, data: { discardedCount: 2, skippedCount: 1 } });
  const feedback: any[] = [];
  const routes: any[] = [];
  const react = {
    useMemo: (fn: () => any) => fn(), useCallback: (fn: any, _deps: any[]) => fn,
    useContext: () => (value: any) => { menu = value; },
    useState: (initial: any) => {
      const index = stateIndex++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value: any) => { states[index] = value; }];
    },
    useRef: (initial: any) => {
      const index = refIndex++;
      refs[index] ??= { current: initial };
      return refs[index];
    },
  };
  const focus = (callback: () => any, deps: any[]) => {
    const index = effectIndex++;
    if (!effects[index] || deps.some((value, i) => value !== effects[index].deps[i])) {
      queuedEffects.push(() => {
        effects[index]?.cleanup?.();
        effects[index] = { deps, cleanup: callback() };
      });
    }
  };
  const callbackDeps = new WeakMap<Function, any[]>();
  const callbacks: { fn: Function; deps: any[] }[] = [];
  let callbackIndex = 0;
  react.useCallback = (fn: any, deps: any[]) => {
    const index = callbackIndex++;
    const old = callbacks[index];
    const result = old && deps.every((value, i) => value === old.deps[i]) ? old.fn : fn;
    callbacks[index] = { fn: result, deps };
    callbackDeps.set(result, deps);
    return result;
  };
  const theme = { spacing: { md: 16, sm: 8, xs: 4, lg: 24, xl: 32 }, colors: {},
    glass: { radius: { nav: 24 } }, typography: { subtitle: { fontFamily: "Poppins" } } };
  const modules: Record<string, any> = {
    react: { ...react, default: react },
    "react/jsx-runtime": { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) },
    "react-native": { Platform: { OS: "ios" }, StyleSheet: { create: (value: any) => value },
      View: "View", ScrollView: "ScrollView", Share: { share: async () => ({}) } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 20, bottom: 20 }) },
    "@react-navigation/native": { useFocusEffect: (fn: Function) => focus(fn as any, callbackDeps.get(fn)!) },
    "expo-router": { router: { push: (route: any) => routes.push(route) }, useLocalSearchParams: () => ({ purchaseRequestId: "request-1" }) },
    "@/src/themes": { useTheme: () => theme },
    "@/src/components/surface/styles": { createRoundedSurfaceStyle: () => ({}) },
    "@/src/components/navbar/DetailTopBarMenuContext": { DetailTopBarMenuContext: {} },
    "@/src/components/conversation/useConversationActions": { normalizeOptionalIcon: (value: any) => value,
      normalizeStyleFlags: (value: any) => ({ isDanger: value === "error" }) },
    "@/src/services/popup.service": { openPopup: (value: any) => { popup = value; } },
    "@/src/services/purchase.request.service": {
      getPurchaseRequestById: async () => ({ ok: true, data: { title: "Request", status: "active" } }),
      addCurrentSellerPurchaseRequestFavorite: async () => { favoriteCalls++; return { ok: true }; },
      removeCurrentSellerPurchaseRequestFavorite: async () => { favoriteCalls++; return { ok: true }; },
    },
    "@/src/services/purchase.offer.service": { getCurrentSellerPurchaseOffers: async () => {
      offerLoads++; return { ok: true, data: [] };
    } },
    "@/src/services/seller.request.offers.service": {
      getCurrentSellerRequestOffersMenu: async () => ({ ok: true, data: menuActions }),
      discardCurrentSellerRequestOffers: async (id: string) => {
        assert.equal(id, "request-1"); discardCalls++; return discard();
      },
    },
    "@/src/utils/useToast": Object.fromEntries(["showError", "showInfo", "showSuccess"].map((name) =>
      [name, (...args: any[]) => feedback.push([name, ...args])])),
    "@/src/utils/purchaseRequestLink": { buildPurchaseRequestUrl: () => "https://luppit.test/request-1" },
    "@/src/utils/conversationOfferPrice": {}, "./detail-top-bar": { DETAIL_TOP_BAR_VISIBLE_HEIGHT: 72 },
    "@/src/components/groupedList/GroupedList": { GroupedListRow: "Row", GroupedListSection: "Section" },
    "@/src/components/Text": { Text: "Text" },
  };
  for (const name of ["button/Button", "glass/GlassSurface", "loading/LoadingState",
    "marketplaceHub/MarketplaceCardFrame", "statusChip/StatusChip"]) modules[`@/src/components/${name}`] = { default: name };
  const source = readFileSync(new URL("../app/(detail)/seller-request-offers.tsx", import.meta.url).pathname, "utf8");
  const exports: any = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { exports, require: (name: string) => {
    assert.ok(name in modules, `Unmocked import: ${name}`); return modules[name];
  } });
  const render = () => {
    stateIndex = refIndex = effectIndex = callbackIndex = 0;
    exports.default();
    const pending = queuedEffects; queuedEffects = [];
    pending.forEach((fn) => fn());
  };
  return {
    render, async ready() { render(); await new Promise((resolve) => setImmediate(resolve)); render(); },
    get menu() { return menu; }, get popup() { return popup; }, get discardCalls() { return discardCalls; },
    get offerLoads() { return offerLoads; }, get favoriteCalls() { return favoriteCalls; }, feedback, routes,
    setDiscard(fn: typeof discard) { discard = fn; }, setMenuActions(actions: any[]) { menuActions = actions; },
    blur() { effects.forEach((effect) => effect.cleanup?.()); },
  };
}

test("seller header menu uses DB actions and opening confirmation makes no mutation", async () => {
  const f = screenFixture(); await f.ready();
  assert.equal(f.menu.testID, "seller-request-options");
  f.menu.onPress();
  assert.equal(f.popup.options[0].label, "DB favorite");
  f.popup.options.find((option: any) => option.id === "bulk").onPress();
  assert.equal(f.popup.type, "summary");
  assert.equal(f.popup.description, "DB confirmation");
  assert.equal(f.popup.rows[0].value, "2");
  assert.equal(f.popup.actions[0].label, "Volver");
  assert.equal(f.popup.actions[0].onPress, undefined);
  assert.equal(f.discardCalls, 0);
});

test("confirmation sends one scoped discard, reports both counts and reloads RPC data", async () => {
  const f = screenFixture(); await f.ready();
  let resolve: (value: any) => void = () => {};
  f.setDiscard(() => new Promise((done) => { resolve = done; }));
  f.menu.onPress(); f.popup.options.find((option: any) => option.id === "bulk").onPress();
  const confirm = f.popup.actions[1].onPress;
  const pending = confirm(); f.render();
  assert.equal(f.menu.disabled, true);
  assert.equal(await confirm(), false);
  assert.equal(f.discardCalls, 1);
  f.setMenuActions([]);
  resolve({ ok: true, data: { discardedCount: 2, skippedCount: 1 } });
  assert.equal(await pending, true); f.render();
  assert.equal(f.offerLoads, 2);
  assert.equal(f.menu, null);
  assert.deepEqual(f.feedback[0], ["showSuccess", "Ofertas descartadas", "Descartadas: 2. Omitidas: 1."]);
});

test("failed discard leaves confirmation open and permits retry", async () => {
  const f = screenFixture(); await f.ready();
  f.setDiscard(async () => ({ ok: false, error: { message: "Forbidden" } }));
  f.menu.onPress(); f.popup.options.find((option: any) => option.id === "bulk").onPress();
  const confirm = f.popup.actions[1].onPress;
  assert.equal(await confirm(), false);
  assert.equal(f.offerLoads, 1);
  f.setDiscard(async () => ({ ok: true, data: { discardedCount: 0, skippedCount: 3 } }));
  assert.equal(await confirm(), true);
  assert.equal(f.discardCalls, 2);
  assert.deepEqual(f.feedback[1], ["showInfo", "No se descartaron ofertas", "Descartadas: 0. Omitidas: 3."]);
});

test("favorite, category and focus cleanup continue to use their existing paths", async () => {
  const f = screenFixture(); await f.ready();
  f.menu.onPress(); f.popup.options[0].onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(f.favoriteCalls, 1);
  f.render(); f.menu.onPress(); f.popup.options[1].onPress();
  assert.equal(f.routes[0].pathname, "/(detail)/category-info");
  f.blur(); assert.equal(f.menu, null);
});

function serviceFixture() {
  const calls: any[] = [];
  let profile: any = { ok: true, data: { id: "active-seller" } };
  let response: any = { data: { ok: true, discarded_count: 2, skipped_count: 1 }, error: null };
  const modules: Record<string, any> = {
    "../db/functions": { RPC_FUNCTIONS: { SELLER_DISCARD_REQUEST_OFFERS: "seller_discard_request_offers",
      GET_SELLER_REQUEST_OFFERS_MENU: "get_seller_request_offers_menu" } },
    "../lib/supabase": { getSession: async () => ({ user: { id: "auth-user" } }) },
    "../lib/supabase/client": { supabase: { rpc: async (name: string, args: any) => {
      calls.push([name, args]); return response;
    } } },
    "../lib/supabase/errors": { fromAppError: (code: string) => ({ code }), fromSupabaseError: (error: any) => error },
    "./active.profile.service": { getCurrentProfileResult: async () => profile },
    "./conversation.service": { parseConversationViewAction: (value: any) => value },
    "./seller.business.setup.service": { requireCurrentSellerBusinessSetup: async () => ({ ok: true }) },
  };
  const source = readFileSync(new URL("../src/services/seller.request.offers.service.ts", import.meta.url).pathname, "utf8");
  const exports: any = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText, { exports, require: (name: string) => {
    assert.ok(name in modules, `Unmocked import: ${name}`); return modules[name];
  } });
  return { service: exports, calls, setProfile(value: any) { profile = value; },
    setResponse(value: any) { response = value; } };
}

test("request services resolve the active seller profile for each RPC call", async () => {
  const f = serviceFixture();
  const result = await f.service.discardCurrentSellerRequestOffers("request-1");
  assert.equal(result.data.discardedCount, 2);
  assert.equal(result.data.skippedCount, 1);
  assert.equal(f.calls[0][0], "seller_discard_request_offers");
  assert.equal(f.calls[0][1].p_profile_id, "active-seller");
  assert.equal(f.calls[0][1].p_purchase_request_id, "request-1");
  f.setProfile({ ok: true, data: { id: "switched-seller" } });
  f.setResponse({ data: { actions: [discardAction] }, error: null });
  const menu = await f.service.getCurrentSellerRequestOffersMenu("request-1");
  assert.equal(menu.data[0].label, "Descartar todas");
  assert.equal(f.calls[1][1].p_profile_id, "switched-seller");
});

test("request services reject missing profiles and malformed results without false success", async () => {
  const f = serviceFixture();
  f.setProfile({ ok: false, error: { code: "auth" } });
  assert.equal((await f.service.discardCurrentSellerRequestOffers("request-1")).ok, false);
  assert.equal(f.calls.length, 0);
  f.setProfile({ ok: true, data: { id: "active-seller" } });
  f.setResponse({ data: {}, error: null });
  assert.equal((await f.service.discardCurrentSellerRequestOffers("request-1")).ok, false);
  f.setResponse({ data: null, error: { message: "Forbidden" } });
  assert.equal((await f.service.discardCurrentSellerRequestOffers("request-1")).error.message, "Forbidden");
});
