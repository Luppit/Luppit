import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as pushHelpers from "../src/services/push-notification.helpers.ts";

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

function providerFixture(initialPermission = "granted", profileState = "location_unavailable") {
  let cursor = 0;
  let permission = initialPermission;
  let tokenListener: ((token: unknown) => void) | null = null;
  const values: any[] = [];
  const pendingEffects: (() => void)[] = [];
  const appStateListeners = new Set<(state: string) => void>();
  const registrations: unknown[] = [];
  let unregistrations = 0;
  const same = (a: unknown[], b: unknown[]) => a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
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
    useCallback(callback: () => any, deps: unknown[]) { return react.useMemo(() => callback, deps); },
    useEffect(callback: () => any, deps: unknown[]) {
      const i = cursor++;
      if (same(values[i]?.deps, deps)) return;
      pendingEffects.push(() => { values[i]?.cleanup?.(); values[i] = { deps, cleanup: callback() }; });
    },
  };
  const profile = {
    state: profileState, activeProfile: { profile: { id: "waiting-seller" } }, profiles: [],
    applyUnreadNotificationCount() {}, refreshProfiles: async () => true,
    refreshUnreadNotificationCount: async () => true, switchProfile: async () => true,
  };
  const modules: Record<string, unknown> = {
    react,
    "react-native": { AppState: { currentState: "active", addEventListener: (_name: string, listener: (state: string) => void) => {
      appStateListeners.add(listener); return { remove: () => appStateListeners.delete(listener) };
    } }, Linking: { openSettings: async () => {} } },
    "@/src/components/profile/ActiveProfileContext": { useActiveProfile: () => profile },
    "@/src/lib/supabase/client": { supabase: {} },
    "@/src/services/notification.service": {},
    "@/src/services/popup.service": { hasOpenPopup: () => false, subscribePopup: () => () => {}, openPopup() {} },
    "@/src/services/push-notification.helpers": pushHelpers,
    "@/src/services/push-notification.service": {
      setForegroundConversationId() {}, configurePushNotificationChannels: async () => {},
      getPushPermissionStatus: async () => ({ status: permission, canAskAgain: true }),
      requestPushPermission: async () => { permission = "granted"; return { status: permission, canAskAgain: true }; },
      registerCurrentPushDevice: async (token: unknown) => { registrations.push(token); return { ok: true, data: null }; },
      unregisterCurrentPushDevice: async () => { unregistrations += 1; return true; },
    },
    "@/src/utils/useToast": { showError() {} },
    "expo-router": { useSegments: () => [], usePathname: () => "/location-unavailable", useGlobalSearchParams: () => ({}), router: {} },
    "expo-notifications": {
      addNotificationReceivedListener: () => ({ remove() {} }),
      addNotificationResponseReceivedListener: () => ({ remove() {} }),
      getLastNotificationResponseAsync: async () => null,
      addPushTokenListener: (listener: typeof tokenListener) => {
        tokenListener = listener; return { remove() { tokenListener = null; } };
      },
    },
  };
  const source = readFileSync(new URL("../src/components/notifications/PushNotificationProvider.tsx", import.meta.url), "utf8");
  const exports: Record<string, any> = {};
  runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, { exports, setTimeout, require(name: string) {
    assert.ok(name in modules, `Unmocked module: ${name}`); return modules[name];
  } });
  return {
    registrations,
    get unregistrations() { return unregistrations; },
    render() {
      cursor = 0;
      const tree = exports.PushNotificationProvider({ children: null });
      pendingEffects.splice(0).forEach((effect) => effect());
      return tree.props.value;
    },
    foreground() { appStateListeners.forEach((listener) => listener("active")); },
    tokenChanged(token: unknown) { tokenListener?.(token); },
    cleanup() { values.forEach((value) => value?.cleanup?.()); },
  };
}

test("waiting sellers register granted push permission on initial load, foreground, and token changes", async (t) => {
  const f = providerFixture(); t.after(f.cleanup);
  f.render(); await settle(); f.render();
  assert.equal(f.registrations.length, 1);
  const token = { type: "ios", data: "test-native-token" };
  f.tokenChanged(token); await settle();
  assert.equal(f.registrations[1], token);
  f.foreground(); await settle();
  assert.equal(f.registrations.length, 3);
  f.cleanup();
  f.foreground(); f.tokenChanged(token); await settle();
  assert.equal(f.registrations.length, 3, "unmounted providers stop all registration listeners");
});

test("waiting sellers can explicitly enable alerts without registering denied permission first", async (t) => {
  const f = providerFixture("denied"); t.after(f.cleanup);
  f.render(); await settle();
  const context = f.render();
  assert.equal(f.registrations.length, 0);
  assert.equal(f.unregistrations, 1);
  await context.enablePushNotifications();
  assert.equal(f.render().permissionStatus, "granted");
  assert.equal(f.registrations.length, 1);
});

test("signed-out sessions cannot register a waiting-seller device", async (t) => {
  const f = providerFixture("granted", "signed_out"); t.after(f.cleanup);
  f.render(); await settle(); f.render();
  f.foreground(); f.tokenChanged({}); await settle();
  assert.equal(f.registrations.length, 0);
});
