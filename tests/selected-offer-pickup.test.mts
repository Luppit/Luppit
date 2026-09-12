import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Real component and shared action callbacks with synthetic I/O; native rendering
// and the live backend lifecycle are outside this harness.
type Element = { type: string | Function; props: Record<string, any> };
const theme = { spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }, borders: { md: 20 }, colors: {}, glass: { headerControl: {}, radius: { chrome: 24 } }, typography: { subtitle: {} } };
function load(path: string, modules: Record<string, unknown>, expose = "") {
  const source = readFileSync(new URL(path, import.meta.url), "utf8") + expose;
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, esModuleInterop: true,
  } });
  const exports: Record<string, any> = {};
  runInNewContext(outputText, { exports, AbortController, console, setTimeout,
    require(name: string) {
      assert.ok(name in modules, `Unmocked import: ${name}`);
      return modules[name];
    },
  });
  return exports;
}
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (value: any) => void;
  const promise = new Promise<any>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value?.props) return [];
  return [value, ...nodes(value.props.children)];
}
function hooks() {
  let cursor = 0;
  const values: any[] = [];
  const effects: (() => void)[] = [];
  const same = (a: any[], b: any[]) => !!a && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    createContext: () => ({ Provider: "ContextProvider" }),
    createElement: (type: Element["type"], props: object, ...children: any[]) => ({ type, props: { ...props, children } }),
    useState(initial: any) {
      const i = cursor++;
      if (!(i in values)) values[i] = typeof initial === "function" ? initial() : initial;
      return [values[i], (next: any) => { values[i] = typeof next === "function" ? next(values[i]) : next; }];
    },
    useRef(initial: any) {
      const i = cursor++;
      return values[i] ??= { current: initial };
    },
    useMemo(callback: Function, deps: any[]) {
      const i = cursor++;
      if (!same(values[i]?.deps, deps)) values[i] = { deps, value: callback() };
      return values[i].value;
    },
    useCallback(callback: Function, deps: any[]) { return react.useMemo(() => callback, deps); },
    useEffect(callback: Function, deps: any[] = []) {
      const i = cursor++;
      if (same(values[i]?.deps, deps)) return;
      effects.push(() => {
        values[i]?.cleanup?.();
        values[i] = { deps, cleanup: callback() };
      });
    },
  };
  return { react, render(callback: Function) {
    cursor = 0;
    const result = callback();
    effects.splice(0).forEach((effect) => effect());
    return result;
  }, unmount() { values.forEach((value) => value?.cleanup?.()); } };
}

const pickupAction = (overrides: Record<string, any> = {}) => ({
  id: "pickup-action", code: "BUYER_REQUEST_PICKUP_CODE", ui_slot: "TOP",
  label: "Generar código de retiro", icon: "smartphone", style_code: "primary",
  executor: { target: "public.request_pickup_transaction_code", execution_type: "server_rpc", requires_refresh: true },
  confirmation: {
    title: "Confirmación desde DB", description_template: "Enviar al correo verificado. {{expiration_copy}}",
    cancel_label: "Volver", confirm_label: "Enviar", confirm_icon: "send", confirm_style_code: "primary",
    fields: [{ label: "Entrega", value: "Correo verificado" }], inputs: [],
    payload_defaults: { metadata_version: "synthetic" }, blocker: null,
  }, ...overrides,
});
const viewResult = (overrides: Record<string, any> = {}) => ({
  ok: true, profileId: "buyer-profile",
  data: {
    role_code: "BUYER",
    conversation: { id: "conversation-A", purchase_request_id: "request-A", purchase_offer_id: "offer-A", status_code: "SELLER_ACCEPTED" },
    context: { expiration_copy: "Vence en 10 minutos." }, permissions: { can_send_messages: false }, actions: [pickupAction()], ...overrides,
  },
});

function fixture() {
  const h = hooks();
  const calls: any[] = [];
  const popups: any[] = [];
  const reads: ReturnType<typeof deferred>[] = [];
  const executions: ReturnType<typeof deferred>[] = [];
  let focus: Function | undefined;
  let blur: Function | undefined;
  let onAppState: Function | undefined;
  const modules = {
    react: h.react,
    "@/src/icons/lucide": { lucideIcons: { smartphone: true, send: true, ellipsis: true } },
    "@/src/services/popup.service": {
      openPopup: (popup: any) => popups.push(popup), closePopup: () => calls.push("closePopup"),
    },
    "@/src/services/conversation.service": {
      getCurrentUserConversationView: (id: string) => { calls.push(["view", id]); const d = deferred(); reads.push(d); return d.promise; },
      executeConversationActionByExecutor: (input: any) => { calls.push(["execute", input]); const d = deferred(); executions.push(d); return d.promise; },
    },
    "@/src/services/purchase.request.service": {
      addCurrentBuyerPurchaseRequestFavorite: async () => ({ ok: true, data: {} }),
      addCurrentSellerPurchaseRequestFavorite: async () => ({ ok: true, data: {} }),
    },
    "@/src/utils/useToast": Object.fromEntries(["showError", "showInfo", "showSuccess", "showWarning"].map((key) => [key, (...args: any[]) => calls.push([key, ...args])])),
    "expo-router": { router: { push: (route: any) => calls.push(["push", route]) } },
    "@react-navigation/native": { useFocusEffect: (cb: Function) => h.react.useEffect(() => {
      focus = () => { blur = cb(); };
      focus(); return () => blur?.();
    }, [cb]) },
    "@/src/themes": { useTheme: () => theme },
    "react-native": { View: "View", AppState: { currentState: "active", addEventListener: (_: string, cb: Function) => {
      onAppState = cb; return { remove() { onAppState = undefined; } };
    } } },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/button/Button": { default: "Button", __esModule: true },
    "@/src/components/conversation/ConversationActionButtons": { default: "ActionButtons", __esModule: true },
  };
  const shared = load("../src/components/conversation/useConversationActions.ts", modules);
  const component = load("../src/components/offerCard/SelectedOfferPickupAction.tsx", {
    ...modules, "@/src/components/conversation/useConversationActions": shared,
  }).default;
  const nativeComponent = (name: string) => ({ default: name, __esModule: true });
  const channel = { on: () => channel, subscribe: () => channel };
  const conversation = load("../app/(conversation)/_layout.tsx", {
    ...modules,
    "@/src/components/conversation/useConversationActions": shared,
    "@/src/utils/useAndroidLeaveGuard": { useAndroidLeaveGuard: () => async (navigate: Function) => navigate() },
    "@/src/utils/useAndroidBackAction": { useAndroidBackAction() {} },
    "@/src/components/glass/GlassSurface": nativeComponent("GlassSurface"),
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/inputChat/inputChat": nativeComponent("InputChat"),
    "@/src/components/inputChat/ChatKeyboardAvoidingView": { ...nativeComponent("ChatKeyboardAvoidingView"), useAndroidChatKeyboardVisible: () => false },
    "@/src/components/loading/LoadingState": nativeComponent("LoadingState"),
    "@/src/lib/supabase": { getSession: async () => null },
    "@/src/lib/supabase/client": { supabase: { realtime: { setAuth: async () => {} }, channel: () => channel, removeChannel() {} } },
    "@/src/services/conversation.message.service": { createConversationMessageGroupId() {}, createConversationMessages() { throw new Error("No messages allowed in fixture"); } },
    "@/src/services/conversation.service": { ...modules["@/src/services/conversation.service"], getCurrentProfileConversationById: async () => ({ ok: true, data: { request_title: "Synthetic request" } }) },
    "@/src/services/toast.service": { clearToastBottomInset() {}, setToastBottomInset() {} },
    "@/src/utils/conversationOfferPrice": { formatConversationOfferPrice: () => null },
    "expo-router": { ...modules["expo-router"], useGlobalSearchParams: () => ({ conversationId: "conversation-A" }), Redirect: "Redirect", Slot: "Slot" },
    "react-native": { ...modules["react-native"], Platform: { OS: "ios" }, Keyboard: {}, Pressable: "Pressable", StyleSheet: { create: (styles: any) => styles } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  }).default;
  const props = { conversationId: "conversation-A", purchaseRequestId: "request-A", purchaseOfferId: "offer-A", onRefresh: () => calls.push("timelineRefresh") };
  let hookOptions = { conversationId: props.conversationId, profileId: "buyer-profile", conversationView: viewResult().data,
    refreshConversation: async () => { calls.push("refreshConversation"); },
    onMessagesRefresh: () => calls.push("messagesRefresh"), onConversationPurged: async () => { calls.push("purged"); },
  };
  return { ...h, calls, reads, executions, popups, props, shared,
    focus: () => focus?.(), blur: () => blur?.(), appState: (state: string) => onAppState?.(state),
    draw: () => h.render(() => component(props)),
    drawConversation: () => h.render(() => conversation()),
    hook: (overrides = {}) => { hookOptions = { ...hookOptions, ...overrides }; return h.render(() => shared.useConversationActions(hookOptions)); },
  };
}
function buttons(tree: any) { return nodes(tree).find((n) => n.type === "ActionButtons"); }
function confirm(f: ReturnType<typeof fixture>) { return f.popups.at(-1).actions.at(-1); }
const executions = (f: ReturnType<typeof fixture>) => f.calls.filter((c) => c[0] === "execute");
async function ready(f: ReturnType<typeof fixture>, result = viewResult()) {
  assert.equal(buttons(f.draw()), undefined);
  f.reads.at(-1)!.resolve(result);
  await flush();
  return f.draw();
}

test("allowed pickup appears from DB metadata without generating anything on mount", async () => {
  const f = fixture();
  const tree = await ready(f);
  assert.equal(buttons(tree)?.props.buttons[0].label, "Generar código de retiro");
  assert.equal(buttons(tree)?.props.buttons[0].tone, "primary");
  assert.equal(executions(f).length, 0);
  buttons(tree)!.props.onPress();
  assert.equal(executions(f).length, 0);
  assert.equal(f.popups[0].title, "Confirmación desde DB");
  assert.equal(f.popups[0].description, "Enviar al correo verificado. Vence en 10 minutos.");
  assert.equal(f.popups[0].rows[0].value, "Correo verificado");
  assert.equal(confirm(f).label, "Enviar");
});

test("does not invent eligibility for shipping, pending, canceled, completed or restricted views", async () => {
  for (const status of ["BUYER_ACCEPTED", "SELLER_ACCEPTED", "DELAYED_ACCEPTANCE", "COMPLETED", "CANCELED", "RESTRICTED"]) {
    const f = fixture();
    const result = viewResult({ actions: [pickupAction({ code: "OTHER_ACTION" }), pickupAction({ id: "menu", code: "BUYER_REQUEST_PICKUP_CODE_MENU", ui_slot: "MENU" })] });
    result.data.conversation.status_code = status;
    assert.equal(buttons(await ready(f, result)), undefined, status);
    assert.equal(executions(f).length, 0);
  }
  // A new backend lifecycle status needs no client allowlist change.
  const f = fixture();
  const result = viewResult(); result.data.conversation.status_code = "FUTURE_ALLOWED_STATE";
  assert.ok(buttons(await ready(f, result)));
});

test("rejects another offer, request, conversation or role and handles read failures", async () => {
  for (const result of [
    { ok: false, error: { type: "auth" } },
    viewResult({ role_code: "SELLER" }),
    ...["id", "purchase_request_id", "purchase_offer_id"].map((key) => viewResult({ conversation: { ...viewResult().data.conversation, [key]: "another" } })),
  ]) {
    const f = fixture();
    const tree = await ready(f, result as any);
    assert.equal(buttons(tree), undefined);
    assert.ok(nodes(tree).some((node) => node.type === "Button" && node.props.title === "Reintentar"));
    assert.equal(executions(f).length, 0);
  }
});

test("read exceptions expose a working retry and late responses cannot overwrite another selected offer", async () => {
  const f = fixture(); f.draw();
  f.reads[0].reject(new Error("synthetic network failure")); await flush();
  const retry = nodes(f.draw()).find((node) => node.type === "Button")!;
  retry.props.onPress(); f.draw();
  f.props.conversationId = "conversation-B"; f.props.purchaseOfferId = "offer-B";
  f.draw();
  f.reads[1].resolve(viewResult()); await flush();
  assert.equal(buttons(f.draw()), undefined);
  f.reads[2].resolve(viewResult({ conversation: { ...viewResult().data.conversation, id: "conversation-B", purchase_offer_id: "offer-B" } })); await flush();
  assert.ok(buttons(f.draw()));
});

test("confirmed pickup uses the configured executor once and refreshes view plus timeline", async () => {
  const f = fixture(); const tree = await ready(f);
  buttons(tree)!.props.onPress();
  const first = confirm(f).onPress();
  assert.equal(buttons(f.draw())!.props.disabled, true);
  assert.equal(buttons(f.draw())!.props.loadingButtonId, "pickup-action");
  const repeated = confirm(f).onPress();
  buttons(tree)!.props.onPress();
  assert.equal(executions(f).length, 1);
  assert.equal(f.popups.length, 1);
  const input = executions(f)[0][1];
  assert.equal(input.conversationId, "conversation-A"); assert.equal(input.profileId, "buyer-profile");
  assert.equal(input.actionCode, "BUYER_REQUEST_PICKUP_CODE");
  assert.equal(input.executor.target, "public.request_pickup_transaction_code");
  assert.equal(input.payload.metadata_version, "synthetic");
  f.executions[0].resolve({ ok: true, data: { success_message: "Código enviado al correo verificado" } });
  await flush(); f.draw();
  assert.equal(f.reads.length, 2);
  const updated = viewResult({ actions: [], context: { pickup_code_expires_at: "2026-09-12T01:10:00Z" } });
  f.reads[1].resolve(updated); await flush();
  assert.equal(await first, true); await repeated;
  assert.equal(buttons(f.draw()), undefined);
  assert.equal(f.calls.filter((c) => c === "timelineRefresh").length, 1);
});

test("an active code does not invent a code viewer, auto-resend, cooldown or permission rule", async () => {
  const f = fixture();
  const result = viewResult({ context: { pickup_code_expires_at: "2026-09-12T01:10:00Z" } });
  const tree = await ready(f, result);
  assert.ok(buttons(tree)); assert.equal(executions(f).length, 0);
  buttons(tree)!.props.onPress(); const pending = confirm(f).onPress();
  f.executions[0].resolve({ ok: false, error: { code: "transaction_code_resend_too_soon", message: "Espera antes de solicitar otro código." } });
  const outcome = await pending;
  assert.equal(outcome.shouldClose, false);
  assert.equal(outcome.feedback.message, "Espera antes de solicitar otro código.");
  assert.equal(buttons(f.draw())!.props.disabled, false);
  assert.equal(f.reads.length, 1);
});

test("executor failures preserve the confirmation and allow an explicit retry", async () => {
  for (const errorCode of ["invalid_transition_for_current_status", "transaction_code_delivery_unavailable", "transaction_code_rate_limited", "profile_not_allowed", "network"]) {
    const f = fixture(); const tree = await ready(f); buttons(tree)!.props.onPress();
    const pending = confirm(f).onPress();
    if (errorCode === "network") f.executions[0].reject(new Error("synthetic failure"));
    else f.executions[0].resolve({ ok: false, error: { code: errorCode, message: "Mensaje del servicio" } });
    const outcome = await pending;
    assert.equal(outcome.shouldClose, false); assert.equal(outcome.feedback.tone, "error");
    assert.equal(buttons(f.draw())!.props.disabled, false);
    const retry = confirm(f).onPress();
    assert.equal(executions(f).length, 2);
    f.executions[1].resolve({ ok: false, error: { message: "Sigue sin estar disponible" } }); await retry;
  }
});

test("metadata email blocker disables confirmation and opens the shared email setup route", async () => {
  const f = fixture(); const action = pickupAction();
  action.confirmation.blocker = { message: "Verifica tu correo", action_label: "Configurar", action_target: "modal.email_setup" } as any;
  const tree = await ready(f, viewResult({ actions: [action] })); buttons(tree)!.props.onPress();
  assert.equal(confirm(f).disabled, true);
  f.popups[0].blocker.onActionPress();
  assert.equal(f.calls.at(-1)[1].pathname, "/(modal)/email-setup");
  assert.equal(executions(f).length, 0);
});

test("shared conversation path keeps refresh metadata, message refresh and purge navigation", async () => {
  for (const mode of ["refresh", "no-refresh", "purged"]) {
    const f = fixture(); const action = pickupAction({ confirmation: null });
    action.executor.requires_refresh = mode !== "no-refresh";
    f.hook().handleActionPress(action);
    f.executions[0].resolve({ ok: true, data: mode === "purged" ? { conversation_deleted: true } : {} }); await flush();
    assert.equal(f.calls.includes("refreshConversation"), mode === "refresh");
    assert.equal(f.calls.includes("messagesRefresh"), mode === "refresh");
    assert.equal(f.calls.includes("purged"), mode === "purged");
    assert.equal(f.hook().isExecutingAction, false);
  }
});

test("shared conversation commands preserve offer creation and editing routes", async () => {
  for (const target of ["modal.offer", "modal.offer.edit"]) {
    const f = fixture();
    f.hook().handleActionPress(pickupAction({ confirmation: null, executor: { target, execution_type: "client_command", requires_refresh: false } }));
    await flush();
    assert.equal(f.calls.at(-1)[1].pathname, "/(modal)/offer");
    assert.equal(f.calls.at(-1)[1].params.conversationId, "conversation-A");
    assert.equal(f.calls.at(-1)[1].params.purchaseRequestId, "request-A");
    assert.equal(executions(f).length, 0);
  }
});

test("return from email setup reloads blocker metadata and foreground refresh invalidates unavailable actions", async () => {
  const f = fixture(); const action = pickupAction();
  action.confirmation.blocker = { message: "Correo requerido" } as any;
  let tree = await ready(f, viewResult({ actions: [action] }));
  buttons(tree)!.props.onPress(); assert.equal(confirm(f).disabled, true);
  f.blur(); f.focus();
  assert.equal(buttons(f.draw()), undefined);
  f.reads.at(-1)!.resolve(viewResult()); await flush();
  tree = f.draw(); buttons(tree)!.props.onPress();
  assert.equal(confirm(f).disabled, false);
  f.appState("background"); f.appState("active");
  assert.equal(buttons(f.draw()), undefined);
  f.reads.at(-1)!.resolve(viewResult({ actions: [] })); await flush();
  assert.equal(buttons(f.draw()), undefined);
  assert.equal(f.calls.includes("timelineRefresh"), true);
  assert.equal(executions(f).length, 0);
  const reads = f.reads.length; f.blur(); f.appState("background"); f.appState("active");
  assert.equal(f.reads.length, reads);
});

test("shared OTP confirmation preserves configured payload key, validation, helper metadata and server input errors", async () => {
  const f = fixture(); const action = pickupAction({ code: "SELLER_CONFIRM_DELIVERY" });
  action.confirmation.inputs = [{ id: "otp-input", kind: "otp", payload_key: "transaction_code", label: "Código", otp_length: 4, is_required: true, options: [], component_config: { helper: { title: "Ayuda del servidor" } } }] as any;
  f.hook().handleActionPress(action);
  assert.equal(confirm(f).onPress().shouldClose, false);
  assert.equal(executions(f).length, 0);
  assert.equal(f.popups[0].inputs[0].component_config.helper.title, "Ayuda del servidor");
  f.popups[0].inputs[0].onValueChange("00");
  assert.ok(confirm(f).onPress().inputErrors["otp-input"]);
  f.popups[0].inputs[0].onValueChange("0000");
  const pending = confirm(f).onPress();
  assert.equal(executions(f)[0][1].payload.transaction_code, "0000");
  f.executions[0].resolve({ ok: false, error: { code: "invalid_transaction_code", message: "Código sintético inválido" } });
  const outcome = await pending;
  assert.equal(outcome.inputErrors["otp-input"], "Código sintético inválido");
  assert.equal(outcome.shouldClose, false);
});

test("shared choice and rating confirmation retain DB inputs and offer-changed handling", async () => {
  const f = fixture(); const action = pickupAction({ code: "BUYER_ACCEPT_OFFER" });
  action.confirmation.inputs = [
    { id: "choice", kind: "choice", payload_key: "fulfillment", label: "Entrega", is_required: true, options: [{ value: "pickup", label: "Retiro", disabled: true }, { value: "shipping", label: "Envío" }] },
    { id: "rating", kind: "rating", payload_key: "review", label: "Califica", is_required: true, options: [] },
  ] as any;
  f.hook().handleActionPress(action);
  assert.equal(f.popups[0].title, "Califica");
  f.popups[0].inputs[0].onValueChange("pickup");
  f.popups[0].inputs[1].onValueChange({ stars: 5, tags: [], comment: "Synthetic" });
  assert.ok(confirm(f).onPress().inputErrors.choice);
  f.popups[0].inputs[0].onValueChange("shipping");
  const pending = confirm(f).onPress();
  assert.equal(executions(f)[0][1].payload.fulfillment, "shipping");
  assert.equal(executions(f)[0][1].payload.review.stars, 5);
  f.executions[0].resolve({ ok: false, error: { code: "offer_changed", message: "La oferta cambió" } });
  assert.equal(await pending, false);
  assert.ok(f.calls.includes("closePopup")); assert.ok(f.calls.includes("refreshConversation"));
});

for (const methods of [["shipping"], ["pickup"], ["shipping", "pickup"]]) {
  test(`accepting ${methods.join("+")} requires an explicit buyer choice and sends the offer revision`, async () => {
    const f = fixture();
    const action = pickupAction({ code: "BUYER_ACCEPT_OFFER" });
    action.confirmation.payload_defaults = { offer_revision: "current-revision" } as any;
    action.confirmation.inputs = [{
      id: "delivery-choice", kind: "choice", payload_key: "fulfillment_catalog_id",
      label: "Método de entrega que aceptas", is_required: true,
      options: methods.map((method) => ({ value: method, method_kind: method, label: method })),
    }] as any;
    f.hook().handleActionPress(action);
    const popup = f.popups[0];
    assert.equal(popup.inputs[0].options.length, methods.length);
    const missingChoice = confirm(f).onPress();
    assert.equal(missingChoice.shouldClose, false);
    assert.equal(missingChoice.feedback.title, "Faltan datos");
    assert.equal(executions(f).length, 0);
    popup.inputs[0].onValueChange("not-offered");
    assert.ok(confirm(f).onPress().inputErrors["delivery-choice"]);
    assert.equal(executions(f).length, 0);
    popup.inputs[0].onValueChange(methods.at(-1));
    const pending = confirm(f).onPress();
    assert.equal(executions(f)[0][1].payload.fulfillment_catalog_id, methods.at(-1));
    assert.equal(executions(f)[0][1].payload.offer_revision, "current-revision");
    f.executions[0].resolve({ ok: true, data: {} });
    await pending;
    assert.equal(executions(f).length, 1);
  });
}

test("actual conversation layout still routes TOP and MENU actions through the extracted handler", async () => {
  for (const slot of ["TOP", "MENU"]) {
    const f = fixture(); f.drawConversation();
    const action = pickupAction({ ui_slot: slot });
    f.reads[0].resolve(viewResult({ actions: [action] })); await flush();
    const tree = f.drawConversation();
    assert.equal(executions(f).length, 0);
    if (slot === "TOP") buttons(tree)!.props.onPress(action.id);
    else {
      nodes(tree).find((node) => node.props.accessibilityLabel === "Más acciones")!.props.onPress();
      f.popups.at(-1).options[0].onPress();
    }
    assert.equal(confirm(f).label, "Enviar");
    const pending = confirm(f).onPress();
    assert.equal(executions(f).length, 1);
    f.executions[0].resolve({ ok: true, data: {} }); await flush();
    f.reads.at(-1)!.resolve(viewResult({ actions: [] })); await flush();
    assert.equal(await pending, true);
    const refreshed = f.drawConversation();
    assert.equal(buttons(refreshed), undefined);
    assert.equal(refreshed.props.value.messageRefreshTick, 1);
  }
});
