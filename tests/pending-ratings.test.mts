import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { parsePendingRatings, parseRatingFollowUp } from "../src/services/conversation.rating.helpers.ts";

const followUp = { action_id: "rate", target_name: "Casa Norte", title: "Te queda calificar",
  description: "Puedes volver después.", later_label: "Después", action_label: "Calificar" };
const active = { conversation: { id: "purchase" }, context: {}, actions: [{ id: "rate" }] };
const closed = { ...active, context: { offer_name: "Mesa", rating_follow_up: { ...followUp, reminder_key: "close" } } };

function reminderHarness() {
  const slots: any[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  let focused = true;
  let popup: any = null;
  let view: any = active;
  let profile = "buyer";
  let executing = false;
  let storageRead: (key: string) => Promise<string | null> = async (key) => storage.get(key) ?? null;
  const storage = new Map<string, string>();
  const listeners = new Set<(value: any) => void>();
  const opened: any[] = [];
  const rated: any[] = [];
  const onRate = (action: any) => { rated.push(action); openPopup({ title: "Rating form" }); };
  const emit = () => listeners.forEach((listener) => listener({ config: popup }));
  function openPopup(config: any) { popup = config; opened.push(config); emit(); }
  function closePopup() { popup = null; emit(); }
  const react = {
    useRef(initial: any) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial: any) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], (value: any) => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }];
    },
    useMemo(fn: () => any, deps: any[]) {
      const i = cursor++;
      if (!slots[i] || deps.some((dep, n) => dep !== slots[i].deps[n])) slots[i] = { deps, value: fn() };
      return slots[i].value;
    },
    useEffect(fn: () => any, deps: any[]) {
      const i = cursor++;
      if (!slots[i] || deps.some((dep, n) => dep !== slots[i].deps[n])) {
        effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  const { outputText } = ts.transpileModule(readFileSync(new URL(
    "../src/components/conversation/useRatingReminder.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports: any = {};
  runInNewContext(outputText, { exports, require(name: string) {
    if (name === "react") return react;
    if (name === "@react-navigation/native") return { useIsFocused: () => focused };
    if (name.includes("conversation.rating.helpers")) return { parseRatingFollowUp };
    if (name.includes("async-storage")) return { default: { getItem: (key: string) => storageRead(key), setItem: async (key: string, value: string) => { storage.set(key, value); } } };
    if (name.includes("popup.service")) return { openPopup, closePopup, hasOpenPopup: () => popup !== null,
      subscribePopup: (listener: any) => { listeners.add(listener); listener({ config: popup }); return () => listeners.delete(listener); } };
    throw new Error(name);
  } });
  function render() {
    cursor = 0; effects = [];
    exports.useRatingReminder(view, profile, executing, onRate);
    effects.forEach((fn) => fn());
  }
  return { opened, rated, storage, openPopup, closePopup, get popup() { return popup; },
    async flush() { for (let i = 0; i < 8; i++) { render(); await Promise.resolve(); } },
    update(next: { view?: any; profile?: string; focused?: boolean; executing?: boolean }) {
      if (next.view !== undefined) view = next.view;
      if (next.profile !== undefined) profile = next.profile;
      if (next.focused !== undefined) focused = next.focused;
      if (next.executing !== undefined) executing = next.executing;
    },
    deferRead(read: typeof storageRead) { storageRead = read; },
  };
}

test("opening a historical completed purchase does not interrupt with a reminder", async () => {
  const h = reminderHarness(); h.update({ view: closed }); await h.flush();
  assert.equal(h.opened.length, 0);
});

test("a newly completed purchase waits for the existing confirmation and executor", async () => {
  const h = reminderHarness(); await h.flush();
  h.openPopup({ title: "Confirm receipt" });
  h.update({ view: closed, executing: true }); await h.flush();
  assert.equal(h.opened.length, 1);
  h.closePopup(); await h.flush(); assert.equal(h.opened.length, 1);
  h.update({ executing: false }); await h.flush();
  assert.equal(h.popup.title, "Te queda calificar");
  assert.equal(h.popup.metadata, "Casa Norte · Mesa");
  assert.equal(h.popup.actions[1].onPress(), false);
  assert.equal(h.popup.title, "Rating form");
  assert.equal(h.rated[0].id, "rate");
});

test("dismissed reminder remains a once per close/profile/device presentation", async () => {
  const h = reminderHarness(); await h.flush(); h.update({ view: closed }); await h.flush();
  assert.equal(h.opened.length, 1); assert.equal(h.storage.size, 1);
  h.closePopup(); h.update({ view: { ...closed } }); await h.flush();
  h.update({ focused: false }); await h.flush(); h.update({ focused: true }); await h.flush();
  assert.equal(h.opened.length, 1);
});

test("profile switch invalidates a reminder awaiting storage", async () => {
  const h = reminderHarness(); await h.flush();
  let resolve!: (value: null) => void;
  h.deferRead(() => new Promise((done) => { resolve = done; }));
  h.update({ view: closed }); await h.flush();
  h.update({ profile: "other", view: active }); await h.flush();
  resolve(null); await h.flush(); assert.equal(h.opened.length, 0);
});

test("server removal of rating eligibility cancels a queued reminder", async () => {
  const h = reminderHarness(); await h.flush(); h.openPopup({ title: "Other sheet" });
  h.update({ view: closed }); await h.flush(); h.update({ view: active }); await h.flush();
  h.closePopup(); await h.flush(); assert.equal(h.opened.length, 1);
});

test("negative closure without a server reminder key stays discoverable without interruption", async () => {
  const h = reminderHarness(); await h.flush();
  h.update({ view: { ...closed, context: { rating_follow_up: { ...followUp, reminder_key: null } } } });
  await h.flush(); assert.equal(h.opened.length, 0);
});

test("pending list parser rejects broken responses instead of presenting a false empty state", () => {
  assert.equal(parsePendingRatings({ total: 0, items: [] }), null);
  const response = { total: 1, page: 1, has_more: false, items: [{ conversation_id: "c", action_id: "a",
    target_name: "Ana", request_title: "Mesa", outcome_label: "Compra cancelada", closed_at: null, price_label: null }],
    ui: { title: "Pendientes", count_label: "1 pendiente", action_label: "Calificar", home_action_label: "Revisar",
      empty_title: "Sin pendientes", empty_description: "Aquí aparecen tus compras." } };
  assert.equal(parsePendingRatings(response)?.items[0].outcomeLabel, "Compra cancelada");
  assert.equal(parsePendingRatings({ ...response, items: [{}] }), null);
  assert.equal(parsePendingRatings({ ...response, total: -1 }), null);
});
