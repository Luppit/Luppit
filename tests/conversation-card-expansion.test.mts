import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

async function harness() {
  const slots: any[] = [];
  const effects: (() => void)[] = [];
  const listeners = new Map<string, (value: boolean) => void>();
  const announcements: string[] = [];
  let cursor = 0;
  let identity = "conversation:buyer";
  let keyboard = false;
  let busy = false;
  let popup = false;
  let dismissals = 0;
  const react = {
    useState(value: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = value;
      return [slots[index], (next: any) => {
        slots[index] = typeof next === "function" ? next(slots[index]) : next;
      }];
    },
    useRef(value: unknown) { const index = cursor++; return slots[index] ??= { current: value }; },
    useCallback(fn: unknown, deps: unknown[]) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) slots[index] = { fn, deps };
      return slots[index].fn;
    },
    useEffect(effect: () => void, deps: unknown[]) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) effects.push(effect);
      slots[index] = deps;
    },
  };
  const source = readFileSync(new URL(
    "../src/components/conversation/useConversationCardExpansion.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports: any = {};
  runInNewContext(outputText, { exports, require: (name: string) => {
    if (name === "react") return react;
    if (name === "react-native") return {
      Keyboard: { dismiss: () => { dismissals++; keyboard = false; } },
      AccessibilityInfo: {
        isScreenReaderEnabled: async () => false,
        isReduceMotionEnabled: async () => false,
        addEventListener: (event: string, callback: (value: boolean) => void) => {
          listeners.set(event, callback);
          return { remove: () => listeners.delete(event) };
        },
        announceForAccessibility: (message: string) => announcements.push(message),
      },
    };
    return { hasOpenPopup: () => popup };
  } });
  let current: any;
  const render = () => {
    cursor = 0;
    current = exports.default(identity, keyboard, busy);
    while (effects.length) effects.shift()!();
    return current;
  };
  render();
  await Promise.resolve();
  render();
  return {
    get current() { return current; }, render, announcements,
    get dismissals() { return dismissals; },
    identity(value: string) { identity = value; render(); return render(); },
    keyboard(value: boolean) { keyboard = value; render(); return render(); },
    busy(value: boolean) { busy = value; render(); return render(); },
    popup(value: boolean) { popup = value; },
    accessibility(event: string, value: boolean) { listeners.get(event)!(value); render(); },
  };
}

test("opens expanded, collapses on interaction, and returns only through explicit expansion", async () => {
  const h = await harness();
  assert.equal(h.current.expanded, true);
  h.current.collapse(); h.render();
  assert.equal(h.current.expanded, false);
  h.render();
  assert.equal(h.current.expanded, false);
  h.current.toggle(); h.render();
  assert.equal(h.current.expanded, true);
  assert.equal(h.dismissals, 1);
});

test("keyboard collapse preserves compact state after hiding and expansion dismisses only the keyboard", async () => {
  const h = await harness();
  h.keyboard(true);
  assert.equal(h.current.expanded, false);
  h.keyboard(false);
  assert.equal(h.current.expanded, false);
  h.keyboard(true);
  h.current.toggle(); h.render();
  assert.equal(h.current.expanded, true);
  assert.equal(h.dismissals, 1);
});

test("open popups and pending actions prevent automatic and manual card transitions", async () => {
  const h = await harness();
  h.popup(true);
  h.current.collapse(); h.current.toggle(); h.render();
  assert.equal(h.current.expanded, true);
  h.keyboard(true);
  assert.equal(h.current.expanded, true);
  h.popup(false); h.keyboard(false); h.busy(true);
  h.current.collapse(); h.current.toggle(); h.render();
  assert.equal(h.current.expanded, true);
  assert.equal(h.dismissals, 0);
});

test("screen reader exploration keeps the card open and manual controls remain available", async () => {
  const h = await harness();
  h.accessibility("screenReaderChanged", true);
  h.current.collapse(); h.render();
  assert.equal(h.current.expanded, true);
  h.current.toggle(); h.render();
  assert.equal(h.current.expanded, false);
  assert.match(h.announcements.at(-1)!, /recogida/);
});

test("conversation/profile changes and reopening reset presentation without following message refreshes", async () => {
  const h = await harness();
  h.current.collapse(); h.render();
  h.identity("conversation:seller");
  assert.equal(h.current.expanded, true);
  h.current.collapse(); h.render();
  h.keyboard(true); h.identity("other:buyer");
  assert.equal(h.current.expanded, false);
  h.keyboard(false); h.current.reset(); h.render();
  assert.equal(h.current.expanded, true);
});

test("motion preference updates disable the card animation", async () => {
  const h = await harness();
  assert.equal(h.current.reduceMotion, false);
  h.accessibility("reduceMotionChanged", true);
  assert.equal(h.current.reduceMotion, true);
});
