import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

function providerFixture(initialProfileId = "buyer") {
  let cursor = 0;
  let currentProfile: any = null;
  const values: any[] = [];
  const pendingEffects: (() => void)[] = [];
  const routes: string[] = [];
  const boundaries: string[] = [];
  const persisted: [string, string][] = [];
  const profiles = [
    { profile: { id: "buyer", is_default: true }, role: "buyer", setupStatus: "ready", unreadCount: 0 },
    { profile: { id: "seller", is_default: false }, role: "seller", setupStatus: "ready", unreadCount: 0 },
    { profile: { id: "waiting-seller", is_default: false }, role: "seller", setupStatus: "location_unavailable", unreadCount: 0 },
  ];
  const same = (a: unknown[], b: unknown[]) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    createElement: (type: unknown, props: unknown) => ({ type, props }),
    useState(initial: any) {
      const i = cursor++;
      if (!(i in values)) values[i] = typeof initial === "function" ? initial() : initial;
      return [values[i], (value: any) => { values[i] = typeof value === "function" ? value(values[i]) : value; }];
    },
    useRef(initial: any) { const i = cursor++; return values[i] ??= { current: initial }; },
    useMemo(callback: () => any, deps: unknown[]) {
      const i = cursor++;
      if (!same(values[i]?.deps, deps)) values[i] = { deps, value: callback() };
      return values[i].value;
    },
    useCallback(callback: (...args: any[]) => any, deps: unknown[]) { return react.useMemo(() => callback, deps); },
    useEffect(callback: () => any, deps: unknown[]) {
      const i = cursor++;
      if (same(values[i]?.deps, deps)) return;
      pendingEffects.push(() => { values[i]?.cleanup?.(); values[i] = { deps, cleanup: callback() }; });
    },
  };
  const modules: Record<string, unknown> = {
    react,
    "react-native": { AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) } },
    "expo-router": { router: { replace: (route: string) => routes.push(route) } },
    "@/src/lib/supabase/client": { supabase: { auth: {
      getSession: async () => ({ data: { session: { user: { id: "user" } } } }),
      getUser: async () => ({ data: { user: { id: "user" } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    } } },
    "@/src/services/active.profile.service": {
      abortProfileScopedRequests: () => boundaries.push("abort"),
      clearLegacySavedProfiles: async () => {},
      getStoredActiveProfileId: async () => initialProfileId,
      isInitialProfileBootstrapPending: () => false,
      listCurrentUserProfiles: async () => ({ ok: true, data: profiles }),
      persistActiveProfileId: async (userId: string, profileId: string) => { persisted.push([userId, profileId]); },
      setCurrentProfileSummary: (profile: unknown) => { currentProfile = profile; },
      setCurrentUserProfileCount() {},
      subscribeActiveProfileRefresh: () => () => {},
    },
    "@/src/services/buyer.home.filters.service": { clearBuyerHomeFilters: () => boundaries.push("buyer filters") },
    "@/src/services/seller.home.filters.service": { clearSellerHomeFilters: () => boundaries.push("seller filters") },
    "@/src/services/segment.service": {
      ALL_SEGMENTS_SVG_NAME: "todas",
      setSelectedSegmentSvgName: (segment: string) => boundaries.push(`segment:${segment}`),
    },
    "@/src/services/popup.service": { closePopup: () => boundaries.push("popup") },
    "@/src/services/notification.service": { getCurrentProfileUnreadNotificationCount: async () => ({ ok: true, data: 0 }) },
    "@/src/services/identity-verification.service": {},
    "@/src/services/identity-verification.helpers": {},
  };
  const source = readFileSync(new URL("../src/components/profile/ActiveProfileContext.tsx", import.meta.url), "utf8");
  const exports: Record<string, any> = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, {
    exports,
    setInterval: () => 1,
    clearInterval() {},
    require(name: string) { assert.ok(name in modules, `Unmocked module: ${name}`); return modules[name]; },
  });
  return {
    routes, boundaries, persisted,
    get currentProfile() { return currentProfile; },
    render() {
      cursor = 0;
      const tree = exports.ActiveProfileProvider({ children: null });
      pendingEffects.splice(0).forEach((effect) => effect());
      return tree.props.value;
    },
    resetObservations() { routes.length = 0; boundaries.length = 0; persisted.length = 0; },
    cleanup() { values.forEach((value) => value?.cleanup?.()); },
  };
}

test("switching to an unavailable seller changes profile state without competing with the location gate", async (t) => {
  const f = providerFixture(); t.after(f.cleanup);
  f.render(); await settle();
  const before = f.render();
  assert.equal(before.activeProfile.profile.id, "buyer");
  f.resetObservations();

  assert.equal(await before.switchProfile("waiting-seller"), true);
  await settle();
  const after = f.render();
  assert.equal(after.state, "location_unavailable");
  assert.equal(after.activeProfile.profile.id, "waiting-seller");
  assert.equal(f.currentProfile.profile.id, "waiting-seller");
  assert.equal(after.profiles.length, 3);
  assert.equal(after.revision, before.revision + 1);
  assert.deepEqual(f.persisted, [["user", "waiting-seller"]]);
  assert.deepEqual(f.boundaries, ["abort", "buyer filters", "seller filters", "segment:todas", "popup"]);
  assert.deepEqual(f.routes, [], "the global location gate owns the unavailable-seller redirect");
});

for (const [initialProfileId, nextProfileId] of [["buyer", "seller"], ["seller", "buyer"], ["waiting-seller", "buyer"]]) {
  test(`switching from ${initialProfileId} to a ready ${nextProfileId} keeps the home navigation and profile boundary`, async (t) => {
    const f = providerFixture(initialProfileId); t.after(f.cleanup);
    f.render(); await settle();
    const before = f.render();
    assert.equal(before.activeProfile.profile.id, initialProfileId);
    assert.equal(before.state, initialProfileId === "waiting-seller" ? "location_unavailable" : "ready");
    f.resetObservations();

    assert.equal(await before.switchProfile(nextProfileId), true);
    await settle();
    const after = f.render();
    assert.equal(after.state, "ready");
    assert.equal(after.activeProfile.profile.id, nextProfileId);
    assert.equal(f.currentProfile.profile.id, nextProfileId);
    assert.equal(after.revision, before.revision + 1);
    assert.deepEqual(f.persisted, [["user", nextProfileId]]);
    assert.deepEqual(f.boundaries, ["abort", "buyer filters", "seller filters", "segment:todas", "popup"]);
    assert.deepEqual(f.routes, ["/(tabs)"]);
  });
}
