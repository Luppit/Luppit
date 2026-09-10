import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { StackRouter } from "@react-navigation/routers";
import { resolveAndroidPopupBack } from "../src/components/popup/androidBack.ts";
import type { PopupSummaryConfig } from "../src/services/popup.service";

function load<T>(path: string, modules: Record<string, unknown>, expose?: string): T {
  const source = readFileSync(new URL(path, import.meta.url), "utf8") +
    (expose ? `\nexport { ${expose} };` : "");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React, esModuleInterop: true,
    },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      assert.ok(name in modules, `Unmocked import: ${name}`);
      return modules[name];
    },
  });
  return exports as T;
}

function backHarness(os = "android") {
  let listener: (() => boolean) | undefined;
  let effect!: () => (() => void) | undefined;
  let currentRef: { current: () => void };
  let registrations = 0;
  let removals = 0;
  let keyboard = false;
  let popup = false;
  let history = true;
  const routes: string[] = [];
  const module = load<typeof import("../src/utils/useAndroidBackAction")>(
    "../src/utils/useAndroidBackAction.ts",
    {
      react: { useRef: () => currentRef, useCallback: (fn: unknown) => fn },
      "@react-navigation/native": { useFocusEffect: (fn: typeof effect) => { effect = fn; } },
      "@/src/services/popup.service": { hasOpenPopup: () => popup },
      "expo-router": { router: {
        canGoBack: () => history,
        back: () => routes.push("back"),
        replace: (href: string) => routes.push(href),
      } },
      "react-native": {
        Platform: { OS: os },
        Keyboard: { isVisible: () => keyboard, dismiss: () => { keyboard = false; } },
        BackHandler: { addEventListener: (_event: string, fn: () => boolean) => {
          registrations++;
          listener = fn;
          return { remove() { removals++; listener = undefined; } };
        } },
      },
    }
  );
  return {
    routes,
    get registrations() { return registrations; },
    get removals() { return removals; },
    setKeyboard(value: boolean) { keyboard = value; },
    setPopup(value: boolean) { popup = value; },
    setHistory(value: boolean) { history = value; },
    goBackOrHome: module.goBackOrHome,
    press: () => listener?.() ?? false,
    mount(onBack: () => void, options = {}) {
      const ref = { current: onBack };
      currentRef = ref;
      module.useAndroidBackAction(onBack, options);
      const focus = effect;
      let cleanup = focus();
      return {
        update(callback: () => void) { ref.current = callback; },
        blur() { cleanup?.(); cleanup = undefined; },
        focus() { cleanup = focus(); },
      };
    },
  };
}

test("nested Back wins regardless of parent registration order; one listener owns the event", () => {
  const h = backHarness();
  const calls: string[] = [];
  const child = h.mount(() => calls.push("category"), { priority: 1 });
  const parent = h.mount(() => calls.push("header"));
  assert.equal(h.registrations, 1);
  assert.equal(h.press(), true);
  assert.deepEqual(calls, ["category"]);
  parent.update(() => calls.push("updated-header"));
  h.press();
  assert.deepEqual(calls, ["category", "category"]);
  child.blur();
  h.press();
  assert.equal(calls.at(-1), "updated-header");
  parent.blur();
  assert.equal(h.removals, 1);
  assert.equal(h.press(), false);
});

test("Create's native Back invokes the actual visible close callback and restores missing Home history", () => {
  const router = StackRouter({ initialRouteName: "(tabs)" });
  const options = {
    routeNames: ["(tabs)", "(chat)"], routeParamList: {}, routeGetIdList: {},
  };
  let state = router.getInitialState(options);
  const redirected = router.getStateForAction(state, {
    type: "REPLACE", payload: { name: "(chat)" },
  }, options)!;
  state = router.getRehydratedState(redirected, options);
  assert.equal(router.getStateForAction(state, { type: "GO_BACK" }, options), null);
  let nativeBack!: () => void;
  const modules = {
    react: {
      createElement: (type: unknown, props: any, ...children: unknown[]) => ({ type, props: { ...props, children } }),
      useState: (initial: unknown) => [initial, () => {}],
      useRef: (initial: unknown) => ({ current: initial }),
      useCallback: (fn: unknown) => fn, useEffect() {},
    },
    "@react-navigation/native": { useNavigation: () => ({ dispatch() {} }), usePreventRemove() {} },
    "@/src/components/profile/ActiveProfileContext": {},
    "@/src/services/popup.service": {},
    "./chat-top-bar": { __esModule: true, default: "ChatTopBar" },
    "./chat-session.context": {
      useChatSession: () => ({ messages: [], uiState: "normal", showComposer: false }),
    },
    "@/src/utils/useAndroidBackAction": { useAndroidBackAction: (fn: () => void) => { nativeBack = fn; } },
    "@/src/utils/useAndroidLeaveGuard": { useAndroidLeaveGuard() {} },
    "@/src/components/inputChat/inputChat": {},
    "@/src/components/inputChat/ChatKeyboardAvoidingView": { __esModule: true, default: "KeyboardView" },
    "@/src/services/role.service": {},
    "@/src/services/toast.service": {},
    "@/src/services/user.role.service": {},
    "@/src/themes": { useTheme: () => ({ colors: {}, spacing: {} }) },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    "react-native": { View: "View", Platform: { OS: "android" }, Keyboard: { dismiss() {} } },
    "expo-router": { Slot: "Slot", router: { dismissTo(href: string) {
      assert.equal(href, "/(tabs)");
      const dismissed = router.getStateForAction(state, { type: "POP_TO", payload: { name: "(tabs)" } }, options)!;
      state = router.getRehydratedState(dismissed, options);
    } } },
  };
  const module = load<{ ChatLayoutContent: () => any }>(
    "../app/(chat)/_layout.tsx", modules, "ChatLayoutContent"
  );
  const tree = module.ChatLayoutContent();
  const topBar = tree.props.children[0].props.children[0];
  assert.equal(topBar.type, "ChatTopBar");
  assert.equal(nativeBack, topBar.props.onClose);
  nativeBack();
  assert.deepEqual(state.routes.map((route) => route.name), ["(tabs)"]);
});

test("the actual Stepper uses one callback for UI and native Back and respects verification locks", () => {
  for (const step of [0, 1]) {
    for (const disabled of [false, true]) {
      let binding: { action: () => void; options: { enabled: boolean; priority: number } };
      let firstStepBacks = 0;
      let nextStep = step;
      const style: any = new Proxy({}, { get: () => style });
      const module = load<{ default: (props: any, ref: unknown) => any }>(
        "../src/components/stepper/Stepper.tsx",
        {
          react: {
            createElement: (type: unknown, props: any, ...children: unknown[]) => ({ type, props: { ...props, children } }),
            forwardRef: (fn: unknown) => fn,
            useState: () => [step, (fn: (current: number) => number) => { nextStep = fn(step); }],
            useRef: (initial: unknown) => ({ current: initial }),
            useMemo: (fn: () => unknown) => fn(), useCallback: (fn: unknown) => fn,
            useImperativeHandle() {},
          },
          "@/src/themes": { useTheme: () => ({ spacing: {} }) },
          "@/src/utils/useAndroidBackAction": { useAndroidBackAction(action: () => void, options: any) { binding = { action, options }; } },
          "react-native": { Platform: { OS: "android" }, Keyboard: { dismiss() {} } },
          "react-native-svg": {}, "../Icon": {}, "../Text": {},
          "./StepperKeyboardContext": { StepperKeyboardContext: {} },
          "./styles": { createStepperStyles: () => style },
        }
      );
      const tree = module.default({
        steps: [{ render() {} }, { render() {} }], initialStep: step,
        backDisabled: disabled, onBackAtFirstStep: () => firstStepBacks++,
      }, null);
      function findBack(node: any): any {
        if (!node?.props) return undefined;
        if (node.props.accessibilityRole === "button") return node;
        return node.props.children?.map(findBack).find(Boolean);
      }
      assert.equal(binding!.action, findBack(tree).props.onPress);
      assert.equal(binding!.options.enabled, true);
      binding!.action();
      assert.equal(firstStepBacks, !disabled && step === 0 ? 1 : 0);
      assert.equal(nextStep, !disabled && step > 0 ? 0 : step);
    }
  }
});

test("focus cleanup and remount do not retain stale screen actions", () => {
  const h = backHarness();
  let called = 0;
  const screen = h.mount(() => called++);
  screen.blur();
  assert.equal(h.press(), false);
  screen.focus();
  h.press();
  assert.equal(called, 1);
  assert.equal(h.registrations, 2);
  screen.blur();
  assert.equal(h.removals, 2);
});

test("keyboard and opening popup consume Back before the route action", () => {
  const h = backHarness();
  let navigated = 0;
  h.mount(() => navigated++);
  h.setKeyboard(true);
  assert.equal(h.press(), true);
  assert.equal(navigated, 0);
  h.setPopup(true);
  assert.equal(h.press(), true);
  assert.equal(navigated, 0);
  h.setPopup(false);
  h.press();
  assert.equal(navigated, 1);
});

test("a busy action consumes Back; hidden controls and iOS never register", () => {
  const android = backHarness();
  android.mount(() => assert.fail("hidden"), { enabled: false });
  assert.equal(android.press(), false);
  android.mount(() => {});
  assert.equal(android.press(), true);
  const ios = backHarness("ios");
  ios.mount(() => assert.fail("iOS"));
  assert.equal(ios.registrations, 0);
});

test("successful editor exit and modal close have an Android no-history Home fallback", () => {
  const h = backHarness();
  h.goBackOrHome();
  h.setHistory(false);
  h.goBackOrHome();
  assert.deepEqual(h.routes, ["back", "/(tabs)"]);
  const ios = backHarness("ios");
  ios.setHistory(false);
  ios.goBackOrHome();
  assert.deepEqual(ios.routes, ["back"]);
});

function guardHarness(os = "android") {
  let index = 0;
  const values: any[] = [];
  const effects: (() => void)[] = [];
  let prevent = false;
  let callback!: (event: { data: { action: unknown } }) => void;
  let focused = true;
  let popup: PopupSummaryConfig | null = null;
  const dispatched: unknown[] = [];
  const module = load<typeof import("../src/utils/useAndroidLeaveGuard")>(
    "../src/utils/useAndroidLeaveGuard.ts",
    {
      react: {
        useRef(initial: unknown) {
          const key = index++;
          values[key] ??= { current: initial };
          return values[key];
        },
        useState(initial: unknown) {
          const key = index++;
          if (!(key in values)) values[key] = initial;
          return [values[key], (next: unknown) => {
            values[key] = typeof next === "function" ? next(values[key]) : next;
          }];
        },
        useCallback: (fn: unknown) => fn,
        useEffect: (fn: () => void) => effects.push(fn),
      },
      "@react-navigation/native": {
        useIsFocused: () => focused,
        useNavigation: () => ({ isFocused: () => focused, dispatch: (action: unknown) => dispatched.push(action) }),
        usePreventRemove: (enabled: boolean, handler: typeof callback) => { prevent = enabled; callback = handler; },
      },
      "@/src/services/popup.service": {
        hasOpenPopup: () => popup !== null,
        openPopup: (config: PopupSummaryConfig) => { popup = config; },
      },
      "react-native": { Platform: { OS: os }, Keyboard: { dismiss() {} } },
    }
  );
  return {
    dispatched,
    get popup() { return popup; },
    get prevent() { return prevent; },
    closePopup() { popup = null; },
    blur() { focused = false; },
    remove(action: unknown) { callback({ data: { action } }); },
    render(dirty: boolean, busy = false) {
      index = 0;
      const allow = module.useAndroidLeaveGuard(dirty, busy);
      effects.splice(0).forEach((fn) => fn());
      return allow;
    },
  };
}

test("dirty Back cancellation retains edits; explicit exit replays the exact original action", async () => {
  const h = guardHarness();
  h.render(true);
  assert.equal(h.prevent, true);
  const action = { type: "POP_TO", payload: { name: "(tabs)" } };
  h.remove(action);
  const cancel = resolveAndroidPopupBack(h.popup, true, false);
  assert.equal(cancel.type, "action");
  if (cancel.type === "action") await cancel.action.onPress?.();
  h.closePopup();
  assert.equal(h.dispatched.length, 0);
  h.render(true);
  assert.equal(h.prevent, true);
  h.remove(action);
  await h.popup!.actions![1].onPress!();
  assert.equal(h.dispatched.length, 1);
  assert.equal(h.dispatched[0], action);
});

test("pending saves and deliveries cannot be discarded; failed work stays guarded", () => {
  const h = guardHarness();
  h.render(false, true);
  assert.equal(h.prevent, true);
  h.remove({ type: "GO_BACK" });
  assert.equal(h.popup, null);
  h.render(true, false);
  h.remove({ type: "GO_BACK" });
  assert.ok(h.popup);
});

test("successful save waits for the guard to disable and awaits asynchronous profile refresh", async () => {
  const h = guardHarness();
  const allow = h.render(true, true);
  const events: string[] = [];
  let finish!: () => void;
  const refresh = new Promise<void>((resolve) => { finish = resolve; });
  const completion = allow(async () => {
    events.push("refresh");
    await refresh;
    events.push("navigate");
  }).then(() => events.push("finished"));
  assert.deepEqual(events, []);
  h.render(true, true);
  assert.equal(h.prevent, false);
  await Promise.resolve();
  assert.deepEqual(events, ["refresh"]);
  finish();
  await completion;
  assert.deepEqual(events, ["refresh", "navigate", "finished"]);
  h.render(true);
  assert.deepEqual(events, ["refresh", "navigate", "finished"]);
});

test("save bypass can process another request and propagates asynchronous failures", async () => {
  const h = guardHarness();
  const allow = h.render(true);
  let calls = 0;
  const first = allow(() => { calls++; });
  h.render(true);
  await first;
  const second = allow(() => { calls++; });
  h.render(true);
  await second;
  assert.equal(calls, 2);
  const error = new Error("refresh failed");
  const failed = allow(async () => { throw error; });
  h.render(true);
  await assert.rejects(failed, error);
  h.render(true);
  assert.equal(h.prevent, true);
});

test("iOS keeps the original awaited save sequence and installs no removal guard", async () => {
  const h = guardHarness("ios");
  const allow = h.render(true, true);
  assert.equal(h.prevent, false);
  let done = false;
  await allow(async () => { await Promise.resolve(); done = true; });
  assert.equal(done, true);
});

test("a stale leave confirmation cannot navigate after focus moves elsewhere", async () => {
  const h = guardHarness();
  h.render(true);
  h.remove({ type: "GO_BACK" });
  h.blur();
  await h.popup!.actions![1].onPress!();
  assert.equal(h.dispatched.length, 0);
});

test("popup Back resolves explicit safe action, not its position or label", () => {
  const copy = { id: "copy", label: "Copiar referencia" };
  const close = { id: "ack", label: "Entendido" };
  const config: PopupSummaryConfig = {
    type: "summary", title: "Recibo", dismissOnBackdropPress: false,
    actions: [copy, close], androidBackActionId: "ack",
  };
  const result = resolveAndroidPopupBack(config, false, false);
  assert.equal(result.type, "action");
  if (result.type === "action") assert.equal(result.action, close);
  assert.equal(resolveAndroidPopupBack(config, false, true).type, "blocked");
  assert.equal(resolveAndroidPopupBack({ ...config, androidBackActionId: "missing" }, true, false).type, "blocked");
  assert.equal(resolveAndroidPopupBack({ ...config, actions: [copy, { ...close, disabled: true }] }, true, false).type, "blocked");
  assert.equal(resolveAndroidPopupBack({ ...config, actions: [copy, copy, close] }, true, false).type, "blocked");
});

test("Android offer close dismisses only its confirmation; locked unconfigured summaries stay locked", () => {
  const config: PopupSummaryConfig = { type: "summary", title: "Salir", dismissOnBackdropPress: false };
  assert.equal(resolveAndroidPopupBack(config, false, false).type, "blocked");
  assert.equal(resolveAndroidPopupBack({ ...config, showCloseButton: true }, false, false).type, "close");
  assert.equal(resolveAndroidPopupBack({ ...config, showCloseButton: true }, false, true).type, "blocked");
  assert.equal(resolveAndroidPopupBack(null, true, false).type, "close");
});
