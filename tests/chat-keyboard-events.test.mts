import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { getChatKeyboardPadding } from "../src/components/inputChat/keyboard.ts";

const KeyboardState = { UNKNOWN: 0, OPENING: 1, OPEN: 2, CLOSING: 3, CLOSED: 4 };
type KeyboardEvent = { endCoordinates: { height: number; screenY: number } };
type Element = { type: string; props: Record<string, unknown> };

// Execute the component with controlled RN events and native animation frames.
function keyboardHarness({
  os = "android",
  androidEnabled = true,
  initialHeight = 0,
  nativeState = KeyboardState.UNKNOWN,
  nativeHeight = 0,
} = {}) {
  let visible = initialHeight > 0;
  let metrics = { height: initialHeight, screenY: 924 - initialHeight };
  let animatedStyle: (() => { paddingBottom: number }) | undefined;
  let nativeSubscriptions = 0;
  const effects: (() => void | (() => void))[] = [];
  const listeners = new Map<string, Set<(event: KeyboardEvent) => void>>();
  const reactions: {
    prepare: () => number;
    react: (value: number, previous: number | null) => void;
    previous: number | null;
  }[] = [];
  const keyboard = { state: { value: nativeState }, height: { value: nativeHeight } };
  const react = {
    createElement(type: string | ((props: object) => Element), props: object, ...children: unknown[]) {
      const nextProps = { ...props, children };
      return typeof type === "function" ? type(nextProps) : { type, props: nextProps };
    },
    useCallback: (fn: unknown) => fn,
    useEffect: (effect: typeof effects[number]) => effects.push(effect),
    useRef: (value: unknown) => ({ current: value }),
  };
  const modules: Record<string, unknown> = {
    react,
    "react-native": {
      View: "View", KeyboardAvoidingView: "KeyboardAvoidingView",
      Platform: { OS: os }, Dimensions: { get: () => ({ height: 924 }) },
      Keyboard: {
        metrics: () => visible ? metrics : undefined,
        isVisible: () => visible,
        addListener(event: string, callback: (event: KeyboardEvent) => void) {
          const callbacks = listeners.get(event) ?? new Set();
          callbacks.add(callback);
          listeners.set(event, callbacks);
          return { remove: () => callbacks.delete(callback) };
        },
      },
    },
    "react-native-reanimated": {
      View: "Animated.View", KeyboardState,
      useSharedValue: (value: unknown) => ({ value }),
      useAnimatedKeyboard() { nativeSubscriptions++; return keyboard; },
      useAnimatedStyle(worklet: typeof animatedStyle) {
        animatedStyle = worklet;
        return worklet?.();
      },
      useAnimatedReaction(
        prepare: () => number,
        reaction: (value: number, previous: number | null) => void,
      ) {
        reactions.push({ prepare, react: reaction, previous: null });
      },
    },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    "./keyboard": { getChatKeyboardPadding },
  };
  const source = readFileSync(new URL(
    "../src/components/inputChat/ChatKeyboardAvoidingView.tsx", import.meta.url,
  ), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React, esModuleInterop: true,
    },
  });
  const exports = {} as { default: (props: object) => Element };
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      assert.ok(name in modules, `Unmocked import: ${name}`);
      return modules[name];
    },
  });
  const element = exports.default({ style: { flex: 1 }, androidEnabled });
  const cleanups = effects.map((effect) => effect());
  const flushReactions = () => {
    for (const reaction of reactions) {
      const current = reaction.prepare();
      reaction.react(current, reaction.previous);
      reaction.previous = current;
    }
  };
  flushReactions();
  return {
    element,
    nativeSubscriptions,
    padding: () => animatedStyle?.().paddingBottom,
    listenerCount: () => [...listeners.values()].reduce((count, callbacks) => count + callbacks.size, 0),
    frame(state: number, height: number) {
      keyboard.state.value = state;
      keyboard.height.value = height;
      flushReactions();
    },
    show(height: number) {
      visible = true;
      metrics = { height, screenY: 924 - height };
      listeners.get("keyboardDidShow")?.forEach((callback) => callback({ endCoordinates: metrics }));
    },
    hide() {
      visible = false;
      listeners.get("keyboardDidHide")?.forEach((callback) => callback({
        endCoordinates: { height: 0, screenY: 924 },
      }));
    },
    unmount() { cleanups.forEach((cleanup) => cleanup?.()); },
  };
}

test("terminal hide releases the composer even when native state and height remain OPEN", () => {
  const h = keyboardHarness({ initialHeight: 336, nativeState: KeyboardState.OPEN, nativeHeight: 336 });
  assert.equal(h.padding(), 336);
  h.hide();
  assert.equal(h.padding(), 0);
  h.frame(KeyboardState.OPEN, 336);
  assert.equal(h.padding(), 0, "a stale open update must not lift the hidden composer again");
});

test("hide clears an already-open mount fallback, and later show refreshes it while native state is UNKNOWN", () => {
  const h = keyboardHarness({ initialHeight: 336 });
  assert.equal(h.padding(), 336);
  h.hide();
  assert.equal(h.padding(), 0);
  h.show(424);
  assert.equal(h.padding(), 424);
  h.hide();
  assert.equal(h.padding(), 0);
  h.show(0);
  assert.equal(h.padding(), 0, "an undocked keyboard must not restore the original height");
});

test("reopening after a stale hide animates before didShow and still closes normally", () => {
  const h = keyboardHarness({ initialHeight: 336, nativeState: KeyboardState.OPEN, nativeHeight: 336 });
  h.hide();
  assert.equal(h.padding(), 0);
  h.frame(KeyboardState.OPENING, 80);
  assert.equal(h.padding(), 80);
  h.frame(KeyboardState.OPENING, 180);
  assert.equal(h.padding(), 180);
  h.frame(KeyboardState.OPEN, 424);
  h.show(424);
  assert.equal(h.padding(), 424);
  h.frame(KeyboardState.CLOSING, 120);
  assert.equal(h.padding(), 120);
  h.frame(KeyboardState.CLOSED, 0);
  assert.equal(h.padding(), 0);
  h.hide();
  h.frame(KeyboardState.OPENING, 60);
  assert.equal(h.padding(), 60);
});

test("didShow can release a hide override even if the stream missed OPENING", () => {
  const h = keyboardHarness({ initialHeight: 336, nativeState: KeyboardState.OPEN, nativeHeight: 336 });
  h.hide();
  assert.equal(h.padding(), 0);
  h.show(336);
  assert.equal(h.padding(), 336);
});

test("mounting with a hidden keyboard ignores stale OPEN data but allows a fresh opening", () => {
  const h = keyboardHarness({ nativeState: KeyboardState.OPEN, nativeHeight: 336 });
  assert.equal(h.padding(), 0);
  h.frame(KeyboardState.OPENING, 80);
  assert.equal(h.padding(), 80);
});

test("a native CLOSED state releases the composer before the JS hide event", () => {
  const h = keyboardHarness({ initialHeight: 336, nativeState: KeyboardState.OPEN, nativeHeight: 336 });
  h.frame(KeyboardState.CLOSED, 336);
  assert.equal(h.padding(), 0);
});

test("keyboard listeners are removed on unmount", () => {
  const h = keyboardHarness({ initialHeight: 336 });
  assert.equal(h.listenerCount(), 2);
  h.unmount();
  assert.equal(h.listenerCount(), 0);
  h.hide();
  assert.equal(h.padding(), 336);
});

test("iOS and Android opt-out preserve their existing KAV behavior without Android subscriptions", () => {
  for (const options of [{ os: "ios" }, { androidEnabled: false }]) {
    const h = keyboardHarness(options);
    assert.equal(h.element.type, "KeyboardAvoidingView");
    assert.equal(h.element.props.behavior, options.os === "ios" ? "padding" : undefined);
    assert.equal(h.element.props.keyboardVerticalOffset, 0);
    assert.equal(h.nativeSubscriptions, 0);
    assert.equal(h.listenerCount(), 0);
  }
});
