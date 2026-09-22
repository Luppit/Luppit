import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as buyerFilters from "../src/services/buyer.home.filters.service.ts";
import * as sellerFilters from "../src/services/seller.home.filters.service.ts";

// Execute the screen callbacks with deferred RPC responses. This verifies state
// transitions and rendered props, not native layout or React scheduling.
type Element = { type: string | Function; props: Record<string, any> };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const plain = (value: any) => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((res) => { resolve = res; });
  return { promise, resolve };
}
function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value?.props) return [];
  return [value, ...nodes(value.props.children)];
}
function text(value: any): string {
  if (Array.isArray(value)) return value.map(text).join("");
  return value?.props ? text(value.props.children) : typeof value === "string" || typeof value === "number" ? String(value) : "";
}
function hooks() {
  let cursor = 0;
  const values: any[] = [];
  const effects: (() => void)[] = [];
  const same = (a: any[], b: any[]) => !!a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    createElement: (type: Element["type"], props: object, ...children: any[]) => ({ type, props: { ...props, children } }),
    useState(initial: any) {
      const i = cursor++;
      if (!(i in values)) values[i] = typeof initial === "function" ? initial() : initial;
      return [values[i], (next: any) => { values[i] = typeof next === "function" ? next(values[i]) : next; }];
    },
    useRef(initial: any) { const i = cursor++; return values[i] ??= { current: initial }; },
    useMemo(callback: Function, deps: any[]) {
      const i = cursor++;
      if (!same(values[i]?.deps, deps)) values[i] = { deps, value: callback() };
      return values[i].value;
    },
    useCallback(callback: Function, deps: any[]) { return react.useMemo(() => callback, deps); },
    useEffect(callback: Function, deps: any[] = []) {
      const i = cursor++;
      if (same(values[i]?.deps, deps)) return;
      effects.push(() => { values[i]?.cleanup?.(); values[i] = { deps, cleanup: callback() }; });
    },
  };
  return {
    react,
    render(component: Function, props?: any) {
      cursor = 0;
      const result = component(props);
      effects.splice(0).forEach((effect) => effect());
      return result;
    },
    cleanup() { values.forEach((value) => value?.cleanup?.()); },
  };
}
function fixture(role: "buyer" | "seller", listing = false, initialFilters?: any) {
  const runtime = hooks();
  buyerFilters.clearBuyerHomeFilters();
  sellerFilters.clearSellerHomeFilters();
  const filterService = role === "buyer" ? buyerFilters : sellerFilters;
  const emptyFilters = role === "buyer" ? buyerFilters.EMPTY_BUYER_HOME_FILTERS : sellerFilters.EMPTY_SELLER_HOME_FILTERS;
  const calls: { args: any[]; response: ReturnType<typeof deferred> }[] = [];
  const routes: any[] = [];
  let popup: any;
  let segment = "todas";
  let segmentListener = (_value: string) => {};
  const params = { role, stageCode: role === "buyer" ? "all" : "for_you", segmentSvgName: "todas", filters: JSON.stringify(initialFilters ?? emptyFilters) };
  const request = (...args: any[]) => { const response = deferred(); calls.push({ args, response }); return response.promise; };
  const modules: Record<string, any> = {
    react: runtime.react,
    "react-native": {
      ...Object.fromEntries(["Image", "Pressable", "ScrollView", "View", "FlatList", "ActivityIndicator"].map((name) => [name, name])),
      StyleSheet: { create: (styles: any) => styles }, Platform: { OS: "ios" },
      AccessibilityInfo: { announceForAccessibility() {} },
    },
    "@/src/themes": { useTheme: () => ({ spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }, borders: { md: 20 }, colors: {}, glass: { radius: { chrome: 28 } }, typography: { subtitle: { lineHeight: 24 }, small: { lineHeight: 18 } } }) },
    "@react-navigation/native": { useFocusEffect: (callback: Function) => runtime.react.useEffect(callback, [callback]) },
    "expo-router": { router: { push: (route: any) => routes.push(route) }, useGlobalSearchParams: () => params },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 44, bottom: 34 }) },
    "./detail-top-bar": { DETAIL_TOP_BAR_VISIBLE_HEIGHT: 56 },
    "@/src/utils/useAndroidBackAction": { useAndroidBackAction() {} },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/BundledSvg": { BundledSvg: "BundledSvg" },
    "@/src/components/surface/styles": { createRoundedSurfaceStyle: () => ({}) },
    "@/src/components/notifications/PushNotificationProvider": { usePushNotifications: () => ({ presentInitialPushPermissionPrompt() {} }) },
    "@/src/components/profile/ActiveProfileContext": { useActiveProfile: () => ({ activeProfile: {} }) },
    "@/src/components/marketplaceHub/openPurchaseRequestCardMenu": { openPurchaseRequestCardMenu() {} },
    "@/src/components/marketplaceHub/usePurchaseRequestFavorites": () => ({ favoriteIds: new Set(), toggle() {} }),
    "@/src/services/buyer.home.filters.service": buyerFilters,
    "@/src/services/seller.home.filters.service": sellerFilters,
    "@/src/services/conversation.service": {},
    "@/src/services/profile.service": {
      getCurrentProfileEmailSetupStatus: async () => ({ ok: true, data: { isComplete: true } }),
      getCurrentSellerBusinessCategorySetupStatus: async () => ({ ok: true, data: { isComplete: true } }),
    },
    "@/src/services/segment.service": {
      ALL_SEGMENTS_SVG_NAME: "todas", getSelectedSegmentSvgName: () => segment,
      subscribeSelectedSegment: (listener: typeof segmentListener) => { segmentListener = listener; return () => {}; },
    },
    "@/src/services/purchase.request.service": {
      DEFAULT_BUYER_MARKETPLACE_HUB_SORT_CODE: "request_newest", DEFAULT_SELLER_MARKETPLACE_HUB_SORT_CODE: "recommended",
      getCurrentBuyerMarketplaceHub: request, getCurrentSellerMarketplaceHub: request,
      getCurrentBuyerMarketplaceHubItems: request, getCurrentSellerMarketplaceHubItems: request,
      getCurrentSellerHomeFilterCategoryOptions: async () => ({ ok: true, data: [{ id: "furniture", label: "Muebles" }, { id: "office", label: "Oficina" }] }),
    },
    "@/src/services/popup.service": { openPopup: (config: any) => { popup = config; } },
    "@/src/utils/useToast": { showError() {} },
    "@/src/utils/openSignOutConfirmation": {},
  };
  for (const [path, name] of Object.entries({
    "button/Button": "Button", "chip/LuppitChip": "LuppitChip", "loading/LoadingState": "LoadingState",
    "marketplaceHub/MarketplaceRequestCard": "MarketplaceRequestCard", "role/RoleGate": "RoleGate",
    "glass/GlassSurface": "GlassSurface", "standaloneList/StandaloneListEmptyState": "StandaloneListEmptyState",
  })) modules[`@/src/components/${path}`] = name;
  const file = listing ? "../app/(detail)/marketplace-hub-section.tsx" : "../app/(tabs)/index.tsx";
  const source = readFileSync(new URL(file, import.meta.url), "utf8") + (listing ? "" : "\nexport { BuyerHomeContent, SellerHomeContent, MarketplaceHomeContent, getRailEmptyMessage };\n");
  const exports: Record<string, any> = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText, {
    exports, console, setTimeout, clearTimeout, requestAnimationFrame: (callback: Function) => callback(),
    require(name: string) { assert.ok(name in modules, `Unmocked import: ${name}`); return modules[name]; },
  });
  const component = listing ? exports.default : role === "buyer" ? exports.BuyerHomeContent : exports.SellerHomeContent;
  return {
    ...runtime, calls, routes, params, modules, exports, filterService, emptyFilters,
    screen: () => runtime.render(component),
    setFilters(filters: any) { (role === "buyer" ? buyerFilters.setBuyerHomeFilters : sellerFilters.setSellerHomeFilters)(filters); },
    setSegment(value: string) { segment = value; segmentListener(value); },
    applyListingFilters(tree: Element, filters: any) {
      nodes(tree).find((node) => node.props.accessibilityHint === "Busca por solicitud, categoría o nombre del comprador")!.props.onPress();
      popup.onApply({ ...filters, selectedChipGroupIds: { categories: filters.selectedCategoryIds, interactionStates: filters.selectedInteractionStates } });
    },
  };
}
function hub(selected: string, counts: Record<string, number>, items: any[] = []) {
  return {
    overview: { active_request_count: 0, attention_request_count: 0, unread_conversation_count: 0, unread_message_count: 0 },
    stages: Object.entries(counts).map(([code, count]) => ({ code, name: code, count, is_selected: code === selected })),
    rail: { title: selected, total: counts[selected] ?? 0, items }, sort: null,
  };
}
function item(id: string, category_id = "furniture") { return { id, purchase_request_id: id, category_id, title: `Silla ${id}` }; }
function resolve(call: { response: ReturnType<typeof deferred> }, data: any) { call.response.resolve({ ok: true, data }); }

for (const role of ["buyer", "seller"] as const) {
  test(`${role}: new queries reveal matching stages, preserve explicit selection, and clear safely`, async (t) => {
    const f = fixture(role);
    t.after(f.cleanup);
    const defaultStage = role === "buyer" ? "all" : "for_you";
    f.screen(); await flush();
    resolve(f.calls[0], hub(defaultStage, { [defaultStage]: 0, needs_attention: 2, history: 1 }));
    await flush();
    assert.equal(f.screen().props.selectedStageCode, defaultStage, "unfiltered home keeps its normal selection");
    const filters = { ...f.emptyFilters, searchValue: "silla", ...(role === "seller" ? { selectedCategoryIds: ["furniture", "office"] } : {}) };
    f.setFilters(filters); f.screen(); await flush();
    resolve(f.calls[1], hub(defaultStage, { [defaultStage]: 0, needs_attention: 2, history: 1 }));
    await flush();
    assert.equal(f.screen().props.isLoading, true, "do not flash a false empty state while loading matching stage");
    await flush();
    assert.equal(f.calls[2].args[2], "needs_attention");
    assert.deepEqual(plain(f.calls[2].args[0]), filters);
    resolve(f.calls[2], hub("needs_attention", { [defaultStage]: 0, needs_attention: 2, history: 1 }, [item("a"), item("b", "office")]));
    await flush();
    let screen = f.screen();
    assert.equal(screen.props.hub.rail.items.length, 2);
    screen.props.onSelectStage(defaultStage); f.screen(); await flush();
    resolve(f.calls[3], hub(defaultStage, { [defaultStage]: 0, needs_attention: 2 }));
    await flush();
    assert.equal(f.screen().props.selectedStageCode, defaultStage, "manual stage selection is not overridden");
    f.setFilters({ ...filters, searchValue: "mesa" }); f.screen(); await flush();
    resolve(f.calls[4], hub(defaultStage, { [defaultStage]: 0, history: 1 }));
    await flush(); f.screen(); await flush();
    assert.equal(f.calls[5].args[2], "history", "changing the query reveals its new matching stage");
    resolve(f.calls[5], hub("history", { [defaultStage]: 0, history: 1 }, [item("c")]));
    await flush(); f.screen();
    f.setFilters({ ...f.emptyFilters }); f.screen(); await flush();
    assert.equal(f.calls[6].args[0].searchValue, "");
    resolve(f.calls[6], hub("history", { history: 3 }, [item("d")]));
    await flush(); screen = f.screen();
    assert.equal(screen.props.hasActiveFilters, false);
    assert.equal(screen.props.hub.rail.items[0].id, "d");
  });

  test(`${role}: slow previous query cannot replace newer or cleared results`, async (t) => {
    const f = fixture(role); t.after(f.cleanup);
    f.screen(); await flush();
    f.setFilters({ ...f.emptyFilters, searchValue: "silla" }); f.screen(); await flush();
    f.setFilters({ ...f.emptyFilters }); f.screen(); await flush();
    const stage = role === "buyer" ? "all" : "for_you";
    resolve(f.calls[2], hub(stage, { [stage]: 1 }, [item("current")]));
    await flush(); f.screen();
    resolve(f.calls[1], hub(stage, { [stage]: 0, history: 3 }));
    resolve(f.calls[0], hub(stage, { [stage]: 0 }));
    await flush();
    assert.equal(f.screen().props.hub.rail.items[0].id, "current");
    assert.equal(f.calls.length, 3);
  });
}

test("category and segment changes retain server filter scope when revealing matches", async (t) => {
  const f = fixture("seller"); t.after(f.cleanup);
  f.screen(); await flush();
  resolve(f.calls[0], hub("for_you", { for_you: 0, needs_attention: 1 })); await flush(); f.screen();
  const filters = { ...f.emptyFilters, selectedCategoryIds: ["office"], selectedInteractionStates: ["opened"], startDate: "2026-09-01", endDate: "2026-09-21" };
  f.setFilters(filters); f.setSegment("productos"); f.screen(); await flush();
  resolve(f.calls[1], hub("for_you", { for_you: 0, needs_attention: 1 })); await flush(); f.screen(); await flush();
  assert.deepEqual(plain(f.calls[2].args), [filters, "productos", "needs_attention"]);
});

test("filtered home exposes DB stage counts in order and carries criteria into Ver todas", (t) => {
  const f = fixture("seller"); t.after(f.cleanup);
  const data = hub("needs_attention", { for_you: 0, needs_attention: 21, in_progress: 4 }, [item("a"), item("b", "office")]);
  const filters = { ...f.emptyFilters, searchValue: "silla", selectedCategoryIds: ["furniture", "office"] };
  const tree = f.render(f.exports.MarketplaceHomeContent, { role: "seller", hub: data, filters, selectedStageCode: "needs_attention", selectedSegmentSvgName: "productos", hasActiveFilters: true, hasFilterChip: true, onSelectStage() {}, onRetry() {} });
  const chips = nodes(tree).filter((node) => node.type === "LuppitChip");
  assert.deepEqual(chips.map((node) => [node.props.label, node.props.count]), [["for_you", 0], ["needs_attention", 21], ["in_progress", 4]]);
  assert.equal(nodes(tree).some((node) => node.type === "View" && node.props.style?.flexWrap === "wrap"), true);
  assert.match(text(tree), /Resultados“silla”21 solicitudes en needs_attention/);
  assert.equal(nodes(tree).find((node) => node.type === "FlatList")!.props.data, data.rail.items);
  nodes(tree).find((node) => node.type === "Pressable" && text(node).includes("Ver todas"))!.props.onPress();
  assert.deepEqual(JSON.parse(f.routes[0].params.filters), filters);
  assert.equal(f.routes[0].params.stageCode, "needs_attention");
  assert.equal(f.routes[0].params.segmentSvgName, "productos");
});

test("empty copy distinguishes actual zero matches, other stages, omitted previews, and load errors", (t) => {
  const f = fixture("buyer"); t.after(f.cleanup);
  const props = { role: "buyer", filters: { ...f.emptyFilters, searchValue: "silla" }, hasActiveFilters: true, selectedStageCode: "all", onSelectStage() {}, onRetry() {} };
  const empty = f.render(f.exports.MarketplaceHomeContent, { ...props, hub: hub("all", { all: 0, history: 0 }) });
  assert.match(empty.props.message, /No encontramos solicitudes con los filtros aplicados/);
  const other = f.render(f.exports.MarketplaceHomeContent, { ...props, hub: hub("all", { all: 0, history: 1 }) });
  const railEmpty = nodes(other).find((node) => typeof node.type === "function" && node.type.name === "HomeRailEmptyState")!;
  assert.match(railEmpty.props.message, /Hay solicitudes que coinciden en otras etapas/);
  const preview = f.render(f.exports.MarketplaceHomeContent, { ...props, hub: hub("all", { all: 3 }) });
  assert.match(nodes(preview).find((node) => typeof node.type === "function" && node.type.name === "HomeRailEmptyState")!.props.message, /Ver todas/);
  const failed = f.render(f.exports.MarketplaceHomeContent, { ...props, hub: null });
  assert.match(failed.props.message, /No pudimos cargar/);
  assert.equal(failed.props.onRetry, props.onRetry);
});

test("seller listing resets query pagination, ignores old pages, and preserves category filters when clearing search", async (t) => {
  const filters = { ...sellerFilters.EMPTY_SELLER_HOME_FILTERS, searchValue: "silla", selectedCategoryIds: ["furniture", "office"] };
  const f = fixture("seller", true, filters); t.after(f.cleanup);
  const list = (tree: Element) => nodes(tree).find((node) => node.type === "FlatList")!;
  f.screen(); await flush();
  resolve(f.calls[0], { items: [item("a"), item("b", "office")], total: 3, page: 1, has_more: true }); await flush();
  let tree = f.screen();
  list(tree).props.onEndReached(); f.screen(); await flush();
  assert.deepEqual(plain(f.calls[1].args), [filters, "todas", "for_you", 2, 20, "recommended"]);
  f.applyListingFilters(tree, { ...filters, searchValue: "mesa", selectedCategoryIds: ["office"] });
  f.screen(); await flush(); tree = f.screen();
  assert.equal(list(tree).props.data.length, 0, "old cards disappear while the new query loads");
  assert.match(text(list(tree).props.ListHeaderComponent), /^0 solicitudes/);
  assert.equal(f.calls[2].args[3], 1);
  resolve(f.calls[1], { items: [item("stale")], total: 3, page: 2, has_more: false });
  resolve(f.calls[2], { items: [], total: 0, page: 1, has_more: false }); await flush(); tree = f.screen();
  assert.equal(list(tree).props.data.length, 0);
  const searchChip = nodes(list(tree).props.ListHeaderComponent).find((node) => node.type === "LuppitChip" && node.props.label === "“mesa”")!;
  searchChip.props.onRemove(); f.screen(); await flush();
  assert.equal(f.calls[3].args[0].searchValue, "");
  assert.deepEqual(plain(f.calls[3].args[0].selectedCategoryIds), ["office"]);
  resolve(f.calls[3], { items: [item("c", "office")], total: 2, page: 1, has_more: true }); await flush(); tree = f.screen();
  list(tree).props.onEndReached(); f.screen(); await flush();
  resolve(f.calls[4], { items: [item("c", "office"), item("d", "office")], total: 2, page: 2, has_more: false }); await flush(); tree = f.screen();
  assert.deepEqual(plain(list(tree).props.data.map((row: any) => row.id)), ["c", "d"]);
  list(tree).props.onEndReached();
  assert.equal(f.calls.length, 5, "authoritative has_more ends pagination");
});

test("buyer listing keeps filters and sorting across pages and resets when route search changes", async (t) => {
  const filters = { ...buyerFilters.EMPTY_BUYER_HOME_FILTERS, searchValue: "silla", selectedChipIds: ["active"] };
  const f = fixture("buyer", true, filters); t.after(f.cleanup);
  const list = () => nodes(f.screen()).find((node) => node.type === "FlatList")!;
  f.screen(); await flush();
  resolve(f.calls[0], { items: [item("a")], total: 2, page: 1, has_more: true }); await flush();
  list().props.onEndReached(); f.screen(); await flush();
  assert.deepEqual(plain(f.calls[1].args), [filters, "todas", "all", "request_newest", 2, 20]);
  resolve(f.calls[1], { items: [item("b", "office")], total: 2, page: 2, has_more: false }); await flush();
  assert.deepEqual(plain(list().props.data.map((row: any) => row.id)), ["a", "b"]);
  f.params.filters = JSON.stringify({ ...filters, searchValue: "" }); f.screen(); await flush();
  assert.equal(list().props.data.length, 0);
  assert.equal(f.calls[2].args[0].searchValue, "");
  assert.deepEqual(plain(f.calls[2].args[0].selectedChipIds), ["active"]);
  assert.equal(f.calls[2].args[4], 1);
});

test("a populated selected stage stays selected and RPC failure is retryable", async (t) => {
  const f = fixture("seller"); t.after(f.cleanup);
  f.setFilters({ ...f.emptyFilters, searchValue: "silla" });
  f.screen(); await flush();
  resolve(f.calls[0], hub("for_you", { needs_attention: 4, for_you: 2 }, [item("a")])); await flush();
  assert.equal(f.screen().props.selectedStageCode, "for_you");
  assert.equal(f.calls.length, 1);
  f.setFilters({ ...f.emptyFilters, searchValue: "mesa" }); f.screen(); await flush();
  f.calls[1].response.resolve({ ok: false, error: { message: "network unavailable" } }); await flush();
  const screen = f.screen();
  assert.equal(screen.props.isLoading, false);
  assert.equal(screen.props.hub, null);
  screen.props.onRetry(); await flush();
  assert.equal(f.calls[2].args[0].searchValue, "mesa");
});
