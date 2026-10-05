import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function harness() {
  const slots: any[] = [];
  const frames: (() => void)[] = [];
  const effects: (() => void)[] = [];
  const calls: { destination: string; y?: number; animated: boolean }[] = [];
  const announcements: string[] = [];
  let cursor = 0;
  let expanded = true;
  let identity = "first";
  const react = {
    useRef(value: unknown) {
      const index = cursor++;
      return slots[index] ??= { current: value };
    },
    useState(value: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = value;
      return [slots[index], (next: any) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useCallback: (fn: unknown) => fn,
    useEffect(effect: () => void, deps: unknown[]) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) effects.push(effect);
      slots[index] = deps;
    },
  };
  const { outputText } = ts.transpileModule(readFileSync(new URL(
    "../src/components/conversation/useConversationScroll.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports: any = {};
  runInNewContext(outputText, { exports,
    requestAnimationFrame: (callback: () => void) => frames.push(callback),
    require(name: string) {
      if (name === "react") return react;
      assert.equal(name, "react-native");
      return { AccessibilityInfo: { announceForAccessibility: (label: string) => announcements.push(label) } };
    },
  });
  const expand = () => { expanded = true; };
  let current: any;
  const render = () => {
    cursor = 0;
    current = exports.default(identity, expanded, expand);
    current.scrollViewRef.current = {
      scrollToEnd: ({ animated }: any) => calls.push({ destination: "latest", animated }),
      scrollTo: ({ y, animated }: any) => calls.push({ destination: "offset", y, animated }),
    };
    effects.splice(0).forEach((effect) => effect());
    return current;
  };
  render();
  calls.length = 0;
  return {
    calls, announcements, render,
    get current() { return current; },
    scroll(offset: number, height = 1800, viewport = 500, user = true) {
      if (user) current.onScrollBeginDrag();
      current.onScroll({ nativeEvent: { contentOffset: { y: offset }, contentSize: { height }, layoutMeasurement: { height: viewport } } });
      render();
    },
    layout(viewport = 500) { current.onLayout({ nativeEvent: { layout: { height: viewport } } }); render(); },
    content(height = 1800) { current.onContentSizeChange(390, height); render(); },
    frame() { frames.splice(0).forEach((callback) => callback()); render(); },
    toggle() { current.toggleHistory(); expanded = !expanded; render(); },
    identity(value: string) { identity = value; render(); },
  };
}

test("opening keeps the current stage visible and offers a route to the end", () => {
  const h = harness();
  h.layout(); h.content(); h.frame();
  assert.equal(h.calls.length, 0);
  assert.equal(h.current.destinations.latest, true);
  assert.equal(h.current.destinations.state, false);
  h.current.scrollToBottom(true, "Últimos mensajes"); h.frame();
  assert.equal(h.calls.at(-1)?.destination, "latest");
  assert.deepEqual(h.announcements, ["Últimos mensajes"]);
});

test("incoming content preserves the reader's offset and follows only an existing end position", () => {
  const h = harness();
  h.scroll(600); h.content(1950); h.frame();
  assert.equal(h.calls.length, 0);
  assert.equal(h.current.atBottomRef.current, false);
  assert.equal(h.current.destinations.state, true);
  assert.equal(h.current.destinations.latest, true);
  h.scroll(1450, 1950); h.content(2100);
  assert.equal(h.calls.at(-1)?.destination, "latest");
  assert.equal(h.announcements.length, 0);
});

test("explicit navigation expands hidden messages before scrolling to their actual end", () => {
  const h = harness();
  h.scroll(600); h.toggle(); h.content(450);
  h.current.scrollToBottom(true, "Últimos mensajes"); h.render(); h.frame();
  assert.equal(h.calls.length, 0);
  h.content(2100);
  assert.equal(h.calls.at(-1)?.destination, "latest");
  assert.deepEqual(h.announcements, ["Últimos mensajes"]);
});

test("show messages restores a saved reading offset without treating it as a jump to the end", () => {
  const h = harness();
  h.scroll(600); h.toggle(); h.content(450); h.scroll(0, 450);
  h.toggle(); h.frame();
  assert.equal(h.calls.length, 0);
  h.content(1800);
  assert.equal(h.calls.at(-1)?.destination, "offset");
  assert.equal(h.calls.at(-1)?.y, 600);
  assert.equal(h.announcements.length, 0);
});

test("return to state targets the card after a long request brief", () => {
  const h = harness();
  h.current.onStageLayout({ nativeEvent: { layout: { y: 80 } } });
  h.current.onCardLayout({ nativeEvent: { layout: { y: 700 } } });
  h.scroll(1300);
  h.current.scrollToState("Estado actual"); h.frame();
  assert.equal(h.calls.at(-1)?.y, 780);
  assert.equal(h.current.atBottomRef.current, false);
  assert.deepEqual(h.announcements, ["Estado actual"]);
});

test("keyboard viewport changes preserve a reader and keep the end reachable", () => {
  const h = harness();
  h.scroll(600); h.layout(280);
  assert.equal(h.calls.length, 0);
  h.scroll(1520, 1800, 280); h.layout(500);
  assert.equal(h.calls.at(-1)?.destination, "latest");
});

test("a reader drag cancels a queued automatic scroll", () => {
  const h = harness();
  h.current.scrollToBottom();
  h.current.onScrollBeginDrag(); h.scroll(500); h.frame(); h.content(2100);
  assert.equal(h.calls.length, 0);
});

test("changing conversation clears saved offsets, pending navigation, and follow state", () => {
  const h = harness();
  h.scroll(1300); h.current.scrollToBottom(true, "Últimos mensajes");
  h.identity("second"); h.frame();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].y, 0);
  assert.equal(h.current.atBottomRef.current, false);
  assert.equal(h.announcements.length, 0);
});


test("initial native scroll events on a short loading placeholder do not follow the first history load", () => {
  const h = harness();
  h.layout(); h.content(350); h.scroll(0, 350, 500, false);
  h.content(1800); h.frame();
  assert.equal(h.calls.length, 0);
  assert.equal(h.current.atBottomRef.current, false);
});


test("animated explicit navigation reaches follow mode after intermediate scroll frames", () => {
  const h = harness();
  h.current.scrollToBottom(true); h.frame();
  h.scroll(600, 1800, 500, false);
  h.scroll(1300, 1800, 500, false);
  assert.equal(h.current.atBottomRef.current, true);
  h.content(1950);
  assert.equal(h.calls.at(-1)?.destination, "latest");
});
