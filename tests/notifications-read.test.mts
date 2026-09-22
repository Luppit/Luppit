import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { ProfileNotificationListItem } from "../src/services/notification.service";

type Element = { type: unknown; props: Record<string, any> };
const failure = { ok: false, error: { type: "network", message: "Sin conexión" } };
const savedAt = "2026-09-22T04:00:00.000Z";
const notification = (id: string, readAt: string | null = null): ProfileNotificationListItem => ({
  notificationId: id, profileId: "active-profile", title: "Nueva oferta", message: "Revisa tu oferta",
  typeCode: "information", typeLabel: null, typeDescription: null, eventCode: null,
  navigation: null, createdAt: "2026-09-21T22:00:00.000Z", readAt,
});

function loadModule(path: string, modules: Record<string, unknown>) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React, esModuleInterop: true,
    },
  });
  const exports: Record<string, any> = {};
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      assert.ok(name in modules, `Unmocked import: ${name}`);
      return modules[name];
    },
  });
  return exports;
}

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

// Execute real screen callbacks with controlled service responses, not native layout.
async function screenHarness(initial = [notification("one"), notification("two")]) {
  const values: unknown[] = [];
  let cursor = 0;
  let mounted = false;
  let focus: () => void = () => {};
  let cleanup: (() => void) | undefined;
  let rows = initial;
  let unreadCount = rows.filter((row) => row.readAt == null).length;
  let listFails = false;
  let listThrows = false;
  let countFails = false;
  let readCalls = 0;
  let bulkCalls = 0;
  let bulkResponse: () => Promise<unknown> = async () => {
    rows = rows.map((row) => ({ ...row, readAt: row.readAt ?? savedAt }));
    return { ok: true, data: { success: true } };
  };
  const errors: unknown[][] = [];
  const successes: unknown[][] = [];
  const popups: unknown[] = [];
  const react = {
    createElement: (type: unknown, props: object, ...children: unknown[]) => ({ type, props: { ...props, children } }),
    useState(initialValue: unknown) {
      const index = cursor++;
      if (!(index in values)) values[index] = initialValue;
      return [values[index], (next: unknown) => {
        values[index] = typeof next === "function" ? next(values[index]) : next;
      }];
    },
    useRef(initialValue: unknown) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initialValue };
      return values[index];
    },
    useEffect(callback: () => () => void) { if (!mounted) cleanup = callback(); },
    useMemo: (callback: () => unknown) => callback(),
    useCallback: (callback: unknown) => callback,
  };
  const screen = loadModule("../app/(detail)/notifications.tsx", {
    react,
    "react-native": { View: "View", ScrollView: "ScrollView", Pressable: "Pressable", ActivityIndicator: "ActivityIndicator", StyleSheet: { create: (value: unknown) => value } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 24 }) },
    "@react-navigation/native": { useFocusEffect: (callback: () => void) => { focus = callback; } },
    "expo-router": { router: { push() {} } },
    "./detail-top-bar": { DETAIL_TOP_BAR_VISIBLE_HEIGHT: 72 },
    "@/src/components/chip/LuppitChip": { default: "LuppitChip", __esModule: true },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/groupedList/GroupedList": { GroupedList: "GroupedList" },
    "@/src/components/surface/styles": { createRoundedSurfaceStyle: () => ({}) },
    "@/src/components/loading/LoadingState": { default: "LoadingState", __esModule: true },
    "@/src/components/standaloneList/StandaloneListEmptyState": { default: "EmptyState", __esModule: true },
    "@/src/themes": { useTheme: () => ({ colors: { primary: "green" }, spacing: { sm: 8, md: 16, lg: 24, xl: 32 }, typography: { subtitle: { fontFamily: "Poppins" } } }), fontFamilies: { medium: "Poppins" } },
    "@/src/utils/useToast": { showError: (...args: unknown[]) => errors.push(args), showSuccess: (...args: unknown[]) => successes.push(args) },
    "@/src/services/popup.service": { openPopup: (popup: unknown) => popups.push(popup) },
    "@/src/components/profile/ActiveProfileContext": { useActiveProfile: () => ({
      unreadNotificationCount: unreadCount,
      applyUnreadNotificationCount: (count: number) => { unreadCount = count; },
      refreshUnreadNotificationCount: async () => {
        if (countFails) return false;
        unreadCount = rows.filter((row) => row.readAt == null).length;
        return true;
      },
    }) },
    "@/src/services/notification.service": {
      getCurrentProfileNotifications: async () => {
        readCalls++;
        if (listThrows) throw new Error("offline");
        return listFails ? failure : { ok: true, data: rows.map((row) => ({ ...row })) };
      },
      markAllCurrentProfileNotificationsRead: () => { bulkCalls++; return bulkResponse(); },
      markCurrentProfileNotificationRead: async (id: string) => {
        rows = rows.map((row) => row.notificationId === id ? { ...row, readAt: savedAt } : row);
        return { ok: true, data: { notificationId: id, readAt: savedAt } };
      },
    },
  });
  const render = (): Element[] => {
    cursor = 0;
    const tree = screen.default();
    mounted = true;
    const elements: Element[] = [];
    const visit = (node: any) => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node?.props) return;
      elements.push(node);
      visit(node.props.children);
    };
    visit(tree);
    return elements;
  };
  render();
  focus();
  await settle();
  return {
    render, errors, successes, popups,
    action: () => render().find((node) => node.props.testID === "mark-all-notifications-read"),
    items: () => render().filter((node) => node.props.notification).map((node) => node.props.notification as ProfileNotificationListItem),
    get unreadCount() { return unreadCount; },
    get bulkCalls() { return bulkCalls; },
    get readCalls() { return readCalls; },
    setBulkResponse(response: typeof bulkResponse) { bulkResponse = response; },
    setRows(next: ProfileNotificationListItem[]) { rows = next; },
    setCount(count: number) { unreadCount = count; },
    failList(value: boolean) { listFails = value; },
    throwList(value: boolean) { listThrows = value; },
    failCount(value: boolean) { countFails = value; },
    async refocus() { focus(); await settle(); },
    unmount() { cleanup?.(); },
  };
}

test("bulk read reloads persisted timestamps and badge count, preserves items, and survives refocus", async () => {
  const h = await screenHarness();
  h.action()!.props.onPress();
  await settle();
  assert.equal(h.bulkCalls, 1);
  assert.equal(h.readCalls, 2);
  assert.equal(h.unreadCount, 0);
  assert.equal(h.items().length, 2);
  assert.ok(h.items().every((item) => item.readAt === savedAt));
  assert.equal(h.action()!.props.onPress, undefined);
  assert.equal(h.successes.length, 1);
  await h.refocus();
  assert.ok(h.items().every((item) => item.readAt === savedAt));
});

test("pending bulk read rejects rapid repeated taps and disables cleanup", async () => {
  const h = await screenHarness();
  let finish!: (result: unknown) => void;
  h.setBulkResponse(() => new Promise((resolve) => { finish = resolve; }));
  const press = h.action()!.props.onPress;
  press(); press();
  assert.equal(h.bulkCalls, 1);
  assert.equal(h.action()!.props.onPress, undefined);
  assert.equal(h.action()!.props.accessibilityState.busy, true);
  assert.equal(h.render().find((node) => node.props.testID === "notification-options")!.props.onPress, undefined);
  assert.equal(h.unreadCount, 2);
  finish(failure);
  await settle();
  assert.equal(h.items()[0].readAt, null);
  assert.equal(h.errors.length, 1);
  assert.equal(h.successes.length, 0);
  assert.equal(typeof h.action()!.props.onPress, "function");
});

test("a thrown request releases pending state without faking a read timestamp", async () => {
  const h = await screenHarness();
  h.setBulkResponse(async () => { throw new Error("offline"); });
  h.action()!.props.onPress();
  await settle();
  assert.equal(h.items()[0].readAt, null);
  assert.equal(typeof h.action()!.props.onPress, "function");
  assert.equal(h.errors.length, 1);
});

test("failed list or badge readback offers retry and never announces success", async () => {
  for (const failedRead of ["list", "count", "exception"]) {
    const h = await screenHarness();
    if (failedRead === "list") h.failList(true);
    else if (failedRead === "count") h.failCount(true);
    else h.throwList(true);
    h.action()!.props.onPress();
    await settle();
    assert.equal(h.successes.length, 0);
    const retry = h.render().find((node) => node.props.actionLabel === "Reintentar");
    assert.ok(retry);
    h.failList(false); h.failCount(false); h.throwList(false);
    retry.props.onAction();
    await settle();
    assert.equal(h.unreadCount, 0);
    assert.ok(h.items().every((item) => item.readAt === savedAt));
  }
});

test("authoritative unread count includes items outside the loaded list and new arrivals remain unread", async () => {
  const h = await screenHarness([notification("visible", savedAt)]);
  h.setCount(4);
  h.setBulkResponse(async () => {
    h.setRows([notification("visible", savedAt), notification("arrived-after-rpc")]);
    return { ok: true, data: { success: true } };
  });
  h.action()!.props.onPress();
  await settle();
  assert.equal(h.bulkCalls, 1);
  assert.equal(h.unreadCount, 1);
  assert.equal(h.items()[1].readAt, null);
  assert.equal(typeof h.action()!.props.onPress, "function");
});

test("opening a detail still reads only its notification", async () => {
  const h = await screenHarness();
  h.render().find((node) => node.props.notification)!.props.onPress();
  await settle();
  assert.equal(h.popups.length, 1);
  assert.equal(h.items()[0].readAt, savedAt);
  assert.equal(h.items()[1].readAt, null);
  assert.equal(h.unreadCount, 1);
  assert.equal(h.bulkCalls, 0);
});

test("empty and already-read lists do not offer an executable bulk read", async () => {
  const empty = await screenHarness([]);
  assert.equal(empty.action(), undefined);
  assert.ok(empty.render().some((node) => node.props.title === "Sin notificaciones"));
  const read = await screenHarness([notification("read", savedAt)]);
  assert.equal(read.action()!.props.onPress, undefined);
});

test("finishing a bulk read after unmount does not update the screen", async () => {
  const h = await screenHarness();
  let finish!: (result: unknown) => void;
  h.setBulkResponse(() => new Promise((resolve) => { finish = resolve; }));
  h.action()!.props.onPress();
  h.unmount();
  finish({ ok: true, data: { success: true } });
  await settle();
  assert.equal(h.readCalls, 1);
  assert.equal(h.successes.length, 0);
});

test("unread filter follows persisted read state and returns to the full history", async () => {
  const h = await screenHarness([notification("unread"), notification("read", savedAt)]);
  const filterChip = () => h.render().find((node) => node.type === "LuppitChip" && node.props.label === "Sin leer")!;
  assert.equal(filterChip().props.count, 1);
  filterChip().props.onPress();
  assert.equal(filterChip().props.selected, true);
  assert.deepEqual(h.items().map((item) => item.notificationId), ["unread"]);
  h.render().find((node) => node.props.notification)!.props.onPress();
  await settle();
  assert.equal(h.items().length, 0);
  assert.equal(filterChip().props.count, 0);
  assert.ok(h.render().some((node) => node.props.title === "Todo al día"));
  h.render().find((node) => node.type === "LuppitChip" && node.props.label === "Todas")!.props.onPress();
  assert.equal(h.items().length, 2);
});

test("bulk read in the unread filter keeps read notifications available in all", async () => {
  const h = await screenHarness();
  h.render().find((node) => node.type === "LuppitChip" && node.props.label === "Sin leer")!.props.onPress();
  h.action()!.props.onPress();
  await settle();
  assert.equal(h.items().length, 0);
  assert.ok(h.render().some((node) => node.props.title === "Todo al día"));
  h.render().find((node) => node.type === "LuppitChip" && node.props.label === "Todas")!.props.onPress();
  assert.equal(h.items().length, 2);
});

test("activity groups use the local calendar date and retain older and invalid timestamps", async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 1);
  const h = await screenHarness([
    { ...notification("today"), createdAt: today.toISOString() },
    { ...notification("yesterday"), createdAt: yesterday.toISOString() },
    { ...notification("unknown"), createdAt: "invalid" },
  ]);
  const headings = h.render().filter((node) => node.type === "Text" && ["Hoy", "Anteriores"].includes(node.props.children[0]));
  assert.deepEqual(headings.map((node) => node.props.children[0]), ["Hoy", "Anteriores"]);
  assert.equal(h.items().length, 3);
});

test("bulk service resolves the active profile and rejects RPC failure receipts", async () => {
  const calls: unknown[][] = [];
  let receipt: unknown = { success: true, updated_count: 8 };
  const service = loadModule("../src/services/notification.service.ts", {
    "../db/functions": { RPC_FUNCTIONS: { MARK_ALL_PROFILE_NOTIFICATIONS_READ: "mark_all_profile_notifications_read" } },
    "../db/tables": {},
    "../lib/supabase/client": { supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: "account" } } } }) },
      rpc: async (...args: unknown[]) => { calls.push(args); return { data: receipt, error: null }; },
    } },
    "../lib/supabase/errors": { fromAppError: (type: string) => ({ type }), fromSupabaseError: (error: unknown) => error },
    "./active.profile.service": { getCurrentProfileResult: async () => ({ ok: true, data: { id: "active-profile" } }) },
  });
  assert.equal((await service.markAllCurrentProfileNotificationsRead()).ok, true);
  assert.equal(calls[0][0], "mark_all_profile_notifications_read");
  assert.equal(JSON.stringify(calls[0][1]), JSON.stringify({ p_profile_id: "active-profile" }));
  for (const invalid of [null, {}, { success: false }]) {
    receipt = invalid;
    assert.equal((await service.markAllCurrentProfileNotificationsRead()).ok, false);
  }
});
