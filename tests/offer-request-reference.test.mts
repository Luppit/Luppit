import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as assistantSummaryReply from "../src/utils/assistantSummaryReply.ts";

// Execute the real service and screen callbacks with deferred I/O. Native layout
// and React scheduling are validated separately, not by this hook harness.
type Element = { type: string | Function; props: Record<string, any> };
const theme = { spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }, borders: { md: 20 }, colors: {} };
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
const snapshot = "Hola, comparto los detalles de mi solicitud para que puedas preparar una oferta exacta:\n\nTitulo: Llantas 225/60 R15 — 4 unidades\nResumen: Llantas nuevas en medida 225/60 R15, cantidad 4.";
const reference = { id: "request-A", title: "Llantas", text: snapshot, source: "conversation" };
const message = (overrides: object = {}) => ({ id: "first", conversation_id: "conversation-A", sender_profile_id: "buyer", message_kind: "TEXT", text: snapshot, created_at: "2026-09-08T12:00:00Z", ...overrides });
function serviceFixture(overrides: Record<string, any> = {}) {
  const calls: any[] = [];
  const view = overrides.view ?? { ok: true, data: { conversation: { id: "conversation-A", purchase_request_id: "request-A", buyer_profile_id: "buyer" } } };
  const messages = overrides.messages ?? { ok: true, data: [message()] };
  const request = "request" in overrides ? overrides.request : { ok: true, data: { id: "request-A", title: "Título actualizado", summary_text: "Cantidad actualizada: 8" } };
  const service = load("../src/services/purchase.offer.reference.service.ts", {
    "../lib/supabase/errors": { fromAppError: (type: string) => ({ type }) },
    "./conversation.service": { getCurrentUserConversationView: async (id: string) => { calls.push(["view", id]); return view; } },
    "./conversation.message.service": { getConversationMessagesByConversationId: async (id: string) => { calls.push(["messages", id]); return messages; } },
    "./purchase.request.service": { getPurchaseRequestById: async (id: string) => { calls.push(["request", id]); return request; } },
  });
  return { calls, read: service.getOfferRequestReference };
}

test("uses the owned conversation request ID and preserves the original snapshot, including legacy details", async () => {
  const text = snapshot + "\nDescripción: Marca X, entrega en San José.";
  const fixture = serviceFixture({ messages: { ok: true, data: [
    message({ id: "later", text: "¿Sigues ahí?", created_at: "2026-09-08T13:00:00Z" }),
    message({ text }), message({ conversation_id: "conversation-B", created_at: "2026-09-08T11:00:00Z" }),
  ] } });
  const result = await fixture.read("conversation-A");
  assert.equal(result.data.text, text);
  assert.equal(result.data.source, "conversation");
  assert.deepEqual(fixture.calls, [["view", "conversation-A"], ["messages", "conversation-A"], ["request", "request-A"]]);
});

test("ownership failure or mismatched conversation stops all subsequent reads", async () => {
  for (const view of [{ ok: false, error: { type: "auth" } }, { ok: true, data: { conversation: { id: "conversation-B", purchase_request_id: "request-B" } } }]) {
    const fixture = serviceFixture({ view });
    assert.equal((await fixture.read("conversation-A")).ok, false);
    assert.equal(fixture.calls.length, 1);
  }
});

test("message-read errors are retryable and never quietly replaced with newer request values", async () => {
  const fixture = serviceFixture({ messages: { ok: false, error: { type: "network" } } });
  assert.equal((await fixture.read("conversation-A")).ok, false);
  assert.equal(fixture.calls.length, 2);
});

test("snapshot remains available if the current request is inaccessible", async () => {
  const fixture = serviceFixture({ request: null });
  assert.equal((await fixture.read("conversation-A")).data.text, snapshot);
});

test("absent snapshot uses labeled current values without inventing missing fields", async () => {
  const fixture = serviceFixture({ messages: { ok: true, data: [] }, request: { ok: true, data: { id: "request-A", title: null, summary_text: "4 unidades, 225/60 R15" } } });
  const result = await fixture.read("conversation-A");
  assert.equal(result.data.source, "request");
  assert.equal(result.data.text, "Resumen: 4 unidades, 225/60 R15");
  const empty = serviceFixture({ messages: { ok: true, data: [] }, request: { ok: true, data: { id: "request-A", title: " ", summary_text: null } } });
  assert.equal((await empty.read("conversation-A")).data.text, null);
});

test("does not mistake a seller message for the buyer request or accept another request's fallback", async () => {
  const fixture = serviceFixture({ messages: { ok: true, data: [message({ sender_profile_id: "seller" })] }, request: { ok: true, data: { id: "request-B", title: "Wrong" } } });
  assert.equal((await fixture.read("conversation-A")).ok, false);
});

function screenFixture(params: Record<string, any> = {}) {
  const runtime = hooks();
  const referenceCalls: { id: string; response: ReturnType<typeof deferred> }[] = [];
  const aiCalls: { input: any; response: ReturnType<typeof deferred> }[] = [];
  const requestCalls: string[] = [];
  const modules: Record<string, any> = {
    react: runtime.react,
    "../../src/utils/assistantSummaryReply": assistantSummaryReply,
    "react-native": { ...Object.fromEntries(["Image", "Pressable", "ScrollView", "View", "TouchableWithoutFeedback"].map((v) => [v, v])), Platform: { OS: "ios" }, Keyboard: { dismiss() {} }, AccessibilityInfo: { announceForAccessibility() {} } },
    "@/src/themes": { useTheme: () => theme },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 50, bottom: 34 }) },
    "expo-router": { router: { back() {}, replace() {} }, useLocalSearchParams: () => params },
    "@react-navigation/native": { useNavigation: () => ({}), useFocusEffect() {}, usePreventRemove() {} },
    "./modal-top-bar": { MODAL_TOP_BAR_HEIGHT: 44 },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/inputField/InputField": { TextField: "TextField" },
    "@/src/components/inputChat/ChatKeyboardAvoidingView": { useAndroidChatKeyboardVisible: () => false },
    "@/src/services/currency.service": { getCurrencies: async () => ({ ok: true, data: [] }) },
    "@/src/services/delivery.catalog.service": { getDeliveryCatalog: async () => ({ ok: true, data: [] }) },
    "@/src/services/popup.service": { openPopup() {} },
    "@/src/utils/useToast": { showError() {}, showInfo() {}, showSuccess() {}, showWarning() {} },
    "@/src/services/purchase.request.service": { getPurchaseRequestById: async (id: string) => { requestCalls.push(id); return { ok: true, data: { id, title: "Edit request" } }; } },
    "@/src/services/purchase.offer.service": { getEditablePurchaseOfferDraftByConversationId: async () => ({ ok: true, data: { purchaseRequestId: "edit-request" } }) },
    "@/src/services/purchase.offer.reference.service": { getOfferRequestReference: (id: string) => { const response = deferred(); referenceCalls.push({ id, response }); return response.promise; } },
    "@/src/services/purchase.offer.assistant.service": {
      createSellerOfferAssistantRequestIdentity: () => ({}),
      callSellerOfferAssistant: (input: any) => { const response = deferred(); aiCalls.push({ input, response }); return response.promise; },
    },
  };
  for (const [path, name] of Object.entries({
    "button/Button": "Button", "assistant/OfferRequestReference": "OfferRequestReference", "assistant/AssistantProcessingProgress": "Progress", "assistant/AssistantReviewCard": "ReviewCard", "expandableInfoCard/ExpandableInfoCard": "ExpandableInfoCard", "filePicker/FilePicker": "FilePicker", "inputChat/inputChat": "InputChat", "message/MessageUtilities": "MessageUtilities", "optionsChecklistCard/OptionsChecklistCard": "OptionsChecklistCard", "loading/LoadingState": "LoadingState", "textArea/TextArea": "TextArea", "textFieldWithToggle/TextFieldWithToggle": "Toggle",
  })) modules[`@/src/components/${path}`] = name;
  const screen = load("../app/(modal)/offer.tsx", modules, "\nexport { OfferAssistantScreen, OfferScreenContent };\n");
  return { ...runtime, modules, referenceCalls, requestCalls, aiCalls,
    route: () => runtime.render(() => screen.default()),
    content: () => runtime.render(() => screen.OfferScreenContent({ params })),
    assistant: () => runtime.render(() => screen.OfferAssistantScreen({ conversationId: "conversation-A", purchaseRequestTitle: reference.title, requestReference: reference })),
  };
}
function aiSuccess(overrides: object = {}) {
  return { ok: true, offerDraftId: null, status: "draft", isReadyToSend: false, missingFields: [], summary: null, assistantMessage: null, messages: [], ...overrides };
}

test("creation ignores serialized request metadata and supports conversation-only entry", async () => {
  for (const params of [{ conversationId: "conversation-A" }, { conversationId: ["conversation-A"], purchaseRequestId: "request-B", purchaseRequest: JSON.stringify({ id: "request-B", title: "Wrong" }) }]) {
    const f = screenFixture(params);
    assert.equal(f.content().type, "LoadingState");
    assert.equal(f.referenceCalls[0].id, "conversation-A");
    f.referenceCalls[0].response.resolve({ ok: true, data: reference });
    await flush();
    const assistant = f.content();
    assert.equal(assistant.props.requestReference, reference);
    assert.equal(assistant.props.purchaseRequestTitle, reference.title);
    assert.equal(f.referenceCalls.length, 1);
    assert.equal(f.requestCalls.length, 0);
  }
});

test("failed load and thrown network errors show retry without mounting an assistant with stale route values", async () => {
  for (const throws of [false, true]) {
    const f = screenFixture({ conversationId: "conversation-A", purchaseRequest: JSON.stringify({ id: "request-B" }) });
    f.content();
    if (throws) f.referenceCalls[0].response.reject(new Error("offline"));
    else f.referenceCalls[0].response.resolve({ ok: false, error: {} });
    await flush();
    const errorNodes = nodes(f.content());
    assert.ok(!errorNodes.some((n) => typeof n.type === "function" && n.type.name === "OfferAssistantScreen"));
    errorNodes.find((n) => n.props.title === "Reintentar")!.props.onPress();
    f.content();
    assert.equal(f.referenceCalls.length, 2);
    f.referenceCalls[1].response.resolve({ ok: true, data: reference });
    await flush();
    assert.equal(f.content().props.requestReference, reference);
  }
});

test("changing conversation or mode remounts route state; late reads cannot apply after leaving", async () => {
  const params = { conversationId: "conversation-A", mode: "create" };
  const f = screenFixture(params);
  const original = f.route().props.key;
  params.conversationId = "conversation-B";
  assert.notEqual(f.route().props.key, original);
  const createKey = f.route().props.key;
  params.mode = "edit";
  assert.notEqual(f.route().props.key, createKey);
  const pending = screenFixture({ conversationId: "conversation-A" });
  pending.content();
  pending.unmount();
  pending.referenceCalls[0].response.resolve({ ok: true, data: reference });
  await flush();
  assert.equal(pending.content().type, "LoadingState");
});

test("published-offer edit mode keeps its existing conversation-backed load", async () => {
  const f = screenFixture({ conversationId: "conversation-A", mode: "edit" });
  f.content(); await flush(); f.content(); await flush(); f.content();
  assert.equal(f.referenceCalls.length, 0);
  assert.deepEqual(f.requestCalls, ["edit-request"]);
});

test("reference persists through first message, images, review and corrections without entering AI input", async () => {
  const f = screenFixture();
  const assertReference = () => assert.equal(nodes(f.assistant()).find((n) => n.type === "OfferRequestReference")?.props.reference, reference);
  assertReference();
  assert.equal(f.aiCalls[0].input.uiAction, "RESTORE");
  f.aiCalls[0].response.resolve(aiSuccess()); await flush();
  const scroll = nodes(f.assistant()).find((n) => n.type === "ScrollView")!;
  const scrollCalls: string[] = [];
  scroll.props.ref.current = { scrollTo: () => scrollCalls.push("top"), scrollToEnd: () => scrollCalls.push("end") };
  scroll.props.onContentSizeChange();
  assert.deepEqual(scrollCalls, ["top"]);
  const image = { uri: "file:///fixture.jpg" };
  nodes(f.assistant()).find((n) => n.type === "InputChat")!.props.onSend({ text: "Ofrezco 4 llantas", images: [image] });
  assertReference();
  assert.equal(f.aiCalls[1].input.prompt, "Ofrezco 4 llantas");
  assert.equal(f.aiCalls[1].input.images[0], image);
  f.aiCalls[1].response.resolve(aiSuccess({ offerDraftId: "draft-A", isReadyToSend: true, assistantMessage: "¿Quieres revisar el resumen?" })); await flush();
  nodes(f.assistant()).find((n) => n.type === "InputChat")!.props.onSend({ text: "Sí", images: [] });
  assert.equal(f.aiCalls[2].input.uiAction, "SHOW_SUMMARY");
  f.aiCalls[2].response.resolve(aiSuccess({ offerDraftId: "draft-A", isReadyToSend: true })); await flush();
  assertReference();
  const review = nodes(f.assistant()).find((n) => typeof n.type === "function" && n.type.name === "OfferSummaryCard")!;
  assert.ok(review);
  assert.equal(review.props.hasOfferPhoto, true);
  const continuing = review.props.onContinue();
  f.aiCalls[3].response.resolve(aiSuccess({ offerDraftId: "draft-A" })); await continuing;
  assertReference();
  assert.ok(!nodes(f.assistant()).some((n) => typeof n.type === "function" && n.type.name === "OfferSummaryCard"));
  assert.ok(f.aiCalls.every(({ input }) => !JSON.stringify(input).includes(snapshot)));
});

test("restoring an existing offer draft keeps the reference separate from restored messages", async () => {
  const f = screenFixture();
  f.assistant();
  f.aiCalls[0].response.resolve(aiSuccess({ offerDraftId: "restored", messages: [{ id: "old", role: "user", content: "Mi oferta guardada", imageUrls: [] }] })); await flush();
  const tree = nodes(f.assistant());
  assert.equal(tree.find((n) => n.type === "OfferRequestReference")?.props.reference, reference);
  const messages = tree.filter((n) => typeof n.type === "function" && n.type.name === "AssistantMessageBubble");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].props.message.text, "Mi oferta guardada");
});

test("reference rendering preserves long content with no truncation and names missing/current states", () => {
  const f = screenFixture();
  const component = load("../src/components/assistant/OfferRequestReference.tsx", f.modules).default;
  const long = snapshot.repeat(25);
  const tree = nodes(component({ reference: { ...reference, text: long } }));
  const body = tree.find((n) => n.props.selectable)!;
  assert.equal(body.props.children[0], long);
  assert.equal(body.props.maxLines, undefined);
  assert.equal(body.props.numberOfLines, undefined);
  const empty = nodes(component({ reference: { ...reference, source: "request", text: null } }));
  assert.ok(empty.some((n) => n.props.children.includes("Referencia actual de la solicitud")));
  assert.ok(empty.some((n) => n.props.children.includes("Esta solicitud no tiene título ni resumen disponibles.")));
});
