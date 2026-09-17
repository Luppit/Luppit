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
  let identitySequence = 0;
  const referenceCalls: { id: string; response: ReturnType<typeof deferred> }[] = [];
  const aiCalls: { input: any; response: ReturnType<typeof deferred> }[] = [];
  const requestCalls: string[] = [];
  const modules: Record<string, any> = {
    react: runtime.react,
    "../../src/utils/assistantSummaryReply": assistantSummaryReply,
    "react-native": { ...Object.fromEntries(["Image", "Pressable", "ScrollView", "View", "TouchableWithoutFeedback"].map((v) => [v, v])), Platform: { OS: "ios" }, Keyboard: { dismiss() {} }, AccessibilityInfo: { announceForAccessibility() {} } },
    "@/src/utils/useAndroidLeaveGuard": { useAndroidLeaveGuard: () => async (navigate: () => void | Promise<void>) => { await navigate(); } },
    "@/src/themes": { useTheme: () => theme },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 50, bottom: 34 }) },
    "expo-router": { router: { back() {}, replace() {} }, useLocalSearchParams: () => params },
    "@react-navigation/native": { useNavigation: () => ({}), useFocusEffect() {}, usePreventRemove() {} },
    "./modal-top-bar": { MODAL_TOP_BAR_HEIGHT: 44 },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/surface/styles": { createRoundedSurfaceStyle: () => ({ borderRadius: 28 }) },
    "@/src/components/inputField/InputField": { TextField: "TextField" },
    "@/src/components/inputChat/ChatKeyboardAvoidingView": { useAndroidChatKeyboardVisible: () => false },
    "@/src/services/currency.service": { getCurrencies: async () => ({ ok: true, data: [] }) },
    "@/src/services/delivery.catalog.service": { getDeliveryCatalog: async () => ({ ok: true, data: [] }) },
    "@/src/services/popup.service": { openPopup() {} },
    "@/src/services/active.profile.service": { getCurrentProfile: () => ({ id: "seller" }), subscribeActiveProfile: () => () => {} },
    "@/src/utils/useToast": { showError() {}, showInfo() {}, showSuccess() {}, showWarning() {} },
    "@/src/services/purchase.request.service": { getPurchaseRequestById: async (id: string) => { requestCalls.push(id); return { ok: true, data: { id, title: "Edit request" } }; } },
    "@/src/services/purchase.offer.service": { getEditablePurchaseOfferDraftByConversationId: async () => ({ ok: true, data: { purchaseRequestId: "edit-request" } }) },
    "@/src/services/purchase.offer.reference.service": { getOfferRequestReference: (id: string) => { const response = deferred(); referenceCalls.push({ id, response }); return response.promise; } },
    "@/src/services/purchase.offer.assistant.service": {
      createSellerOfferAssistantRequestIdentity: () => ({ clientRequestId: `request-${++identitySequence}`, idempotencyKey: `key-${identitySequence}` }),
      callSellerOfferAssistant: (input: any) => { const response = deferred(); aiCalls.push({ input, response }); return response.promise; },
    },
  };
  for (const [path, name] of Object.entries({
    "button/Button": "Button", "assistant/OfferRequestReference": "OfferRequestReference", "assistant/AssistantProcessingProgress": "Progress", "assistant/AssistantReviewCard": "ReviewCard", "expandableInfoCard/ExpandableInfoCard": "ExpandableInfoCard", "filePicker/FilePicker": "FilePicker", "inputChat/inputChat": "InputChat", "message/MessageUtilities": "MessageUtilities", "optionsChecklistCard/OptionsChecklistCard": "OptionsChecklistCard", "loading/LoadingState": "LoadingState", "textArea/TextArea": "TextArea", "textFieldWithToggle/TextFieldWithToggle": "Toggle",
  })) modules[`@/src/components/${path}`] = name;
  const screen = load("../app/(modal)/offer.tsx", modules, "\nexport { OfferAssistantScreen, OfferScreenContent, OfferSummaryCard, OfferEditContext };\n");
  return { ...runtime, modules, referenceCalls, requestCalls, aiCalls,
    summary: (summary: object, overrides: object = {}) => screen.OfferSummaryCard({ summary, purchaseRequestTitle: "Llantas", offerPhotoCount: 1, hasOfferPhoto: true, missingFields: [], disabled: false, loading: false, ...overrides }),
    context: (props: object) => runtime.render(() => screen.OfferEditContext({ reference, images: [], hasChanges: false, summary: null, ...props })),
    route: () => runtime.render(() => screen.default()),
    content: () => runtime.render(() => screen.OfferScreenContent({ params })),
    assistant: () => runtime.render(() => screen.OfferAssistantScreen({ conversationId: "conversation-A", purchaseRequestTitle: reference.title, requestReference: reference, mode: params.mode ?? "create" })),
  };
}
function aiSuccess(overrides: object = {}) {
  return { ok: true, offerDraftId: null, status: "draft", isReadyToSend: false, missingFields: [], summary: null, assistantMessage: null, messages: [], ...overrides };
}

test("seller summary control serializes the user's acknowledgement with its existing draft and retry identity", () => {
  const service = load("../src/services/purchase.offer.assistant.service.ts", {
    "../lib/supabase": {}, "../lib/supabase/errors": {}, "./active.profile.service": {},
  }, "\nexport { buildJsonBody };\n");
  const identity = { clientRequestId: "summary-request", idempotencyKey: "summary-retry" };
  const body = JSON.parse(service.buildJsonBody({ prompt: " Sí ", offerDraftId: "saved", uiAction: "SHOW_SUMMARY" }, identity, "seller"));
  assert.deepEqual(body, {
    prompt: "Sí", conversation_id: null, offer_draft_id: "saved", ui_action: "SHOW_SUMMARY",
    client_request_id: identity.clientRequestId, idempotency_key: identity.idempotencyKey, active_profile_id: "seller",
    mode: "create", expected_draft_version: null, expected_offer_revision: null,
  });
});

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

test("published-offer edit opens the same AI assistant using conversation-backed reference", async () => {
  const f = screenFixture({ conversationId: "conversation-A", mode: "edit" });
  f.content();
  f.referenceCalls[0].response.resolve({ ok: true, data: reference });
  await flush();
  assert.equal(f.content().props.mode, "edit");
  assert.equal(f.content().props.requestReference, reference);
  assert.equal(f.requestCalls.length, 0);
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
  f.aiCalls[1].response.resolve(aiSuccess({ offerDraftId: "draft-A", status: "ready", isReadyToSend: true, assistantMessage: "Tu oferta está lista. ¿Deseas ver el resumen?" })); await flush();
  nodes(f.assistant()).find((n) => n.type === "InputChat")!.props.onSend({ text: "Sí", images: [] });
  assert.equal(f.aiCalls[2].input.uiAction, "SHOW_SUMMARY");
  assert.equal(typeof nodes(f.assistant()).find((n) => n.type === "InputChat")!.props.onStop, "function");
  assert.equal(nodes(f.assistant()).find((n) => n.type === "Progress")!.props.variant, "thinking");
  assert.equal(nodes(f.assistant()).find((n) => n.type === "Progress")!.props.onStop, undefined);
  f.aiCalls[2].response.resolve(aiSuccess({ offerDraftId: "draft-A", offerImages: [{ storageRef: "storage://offers/seller/photo", url: "https://example.test/photo" }], isReadyToSend: true, summary: { descripcion: "4 llantas" } })); await flush();
  assertReference();
  const review = nodes(f.assistant()).find((n) => typeof n.type === "function" && n.type.name === "OfferSummaryCard")!;
  assert.ok(review);
  assert.equal(review.props.hasOfferPhoto, true);
  const publishing = review.props.onPublish();
  assert.equal(f.aiCalls[3].input.uiAction, "PUBLISH");
  assert.equal(nodes(f.assistant()).find((n) => n.type === "Progress")!.props.variant, "thinking");
  const publishingComposer = nodes(f.assistant()).find((n) => n.type === "InputChat")!.props;
  assert.equal(publishingComposer.busy, true);
  assert.equal(publishingComposer.disabled, true);
  assert.equal(publishingComposer.onStop, undefined);
  f.aiCalls[3].response.resolve(aiSuccess({ offerDraftId: "draft-A", isReadyToSend: true })); await publishing;
  const continuing = review.props.onContinue();
  assert.equal(nodes(f.assistant()).find((n) => n.type === "Progress")!.props.variant, "thinking");
  assert.equal(nodes(f.assistant()).find((n) => n.type === "InputChat")!.props.onStop, undefined);
  f.aiCalls[4].response.resolve(aiSuccess({ offerDraftId: "draft-A" })); await continuing;
  assertReference();
  assert.ok(!nodes(f.assistant()).some((n) => typeof n.type === "function" && n.type.name === "OfferSummaryCard"));
  assert.ok(f.aiCalls.every(({ input }) => !JSON.stringify(input).includes(snapshot)));
});

test("offer composer stops a pending image message, preserves its draft, and ignores a late reply during the next send", async () => {
  const f = screenFixture();
  const composer = () => nodes(f.assistant()).find((n) => n.type === "InputChat")!.props;
  f.assistant();
  assert.equal(composer().busy, true);
  assert.equal(composer().disabled, true);
  assert.equal(composer().onStop, undefined);
  f.aiCalls[0].response.resolve(aiSuccess({ offerDraftId: "saved" })); await flush();

  const image = { uri: "file:///offer-photo.jpg" };
  composer().onSend({ text: "Tengo 3 llantas", images: [image] });
  assert.equal(composer().busy, true);
  assert.equal(composer().disabled, true);
  const progress = nodes(f.assistant()).find((n) => n.type === "Progress")!.props;
  assert.equal(progress.variant, "thinking");
  assert.equal(progress.onStop, undefined);
  composer().onStop();
  assert.equal(f.aiCalls[1].input.signal.aborted, true);
  assert.equal(composer().busy, false);
  assert.equal(composer().disabled, false);
  assert.equal(composer().onStop, undefined);
  assert.ok(!nodes(f.assistant()).some((n) => n.type === "Progress"));

  composer().onSend({ text: "Son 4 llantas", images: [] });
  assert.equal(f.aiCalls[2].input.offerDraftId, "saved");
  f.aiCalls[1].response.resolve(aiSuccess({ offerDraftId: "stale", assistantMessage: "Late response" })); await flush();
  assert.equal(composer().busy, true);
  assert.equal(f.aiCalls[2].input.signal.aborted, false);
  const messages = nodes(f.assistant()).filter((n) => typeof n.type === "function" && n.type.name === "AssistantMessageBubble");
  assert.equal(messages.length, 2);
  assert.equal(messages[0].props.message.images[0], image);

  f.aiCalls[2].response.resolve(aiSuccess({ offerDraftId: "saved", assistantMessage: "¿Qué precio?" })); await flush();
  assert.equal(composer().busy, false);
  assert.equal(composer().disabled, false);
  assert.equal(nodes(f.assistant()).filter((n) => typeof n.type === "function" && n.type.name === "AssistantMessageBubble").at(-1)!.props.message.text, "¿Qué precio?");
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

const offerInvitation = "Tu oferta está lista. ¿Deseas ver el resumen?";
const offerReviewInstruction = "Aquí tienes el resumen de la oferta. ¿Deseas enviarla o seguir ajustando?";
const readyOffer = {
  offerDraftId: "saved", status: "ready", isReadyToSend: true,
  offerImages: [{ storageRef: "storage://offers/seller/photo", url: "https://example.test/photo" }],
  hasChanges: true, draftVersion: 2, baseOfferRevision: "published-revision",
  summary: { descripcion: "3 llantas", precio: 55000, basePrecio: "UNIT", cantidadOfrecida: 3, precioTotal: 165000, moneda: "COL" },
};
const offerFailure = { ok: false, error: { type: "network", message: "Intenta de nuevo" } };

test("seller review groups the available delivery methods without inventing a shipping cost", () => {
  const f = screenFixture();
  for (const [entrega, retiro, expected] of [
    ["Envío", "Recoger en tienda", "Envío · Recoger en tienda"],
    ["Envío", null, "Envío"],
    [null, "Recoger en tienda", "Recoger en tienda"],
    [null, null, null],
  ]) {
    const card = f.summary({ ...readyOffer.summary, entrega, retiro, precioEnvio: null });
    const methods = card.props.rows.filter((row: any) => row.label === "Opciones de entrega");
    assert.equal(methods.length, expected ? 1 : 0);
    if (expected) assert.equal(methods[0].value, expected);
    assert.ok(!card.props.rows.some((row: any) => row.label === "Costo de envío"));
    assert.equal(card.props.primaryDisabled, false);
    assert.match(card.props.completionDescription, /comprador deberá elegir y aceptar/);
  }
});

test("an incomplete offer review never shows a success state and remains editable", () => {
  const f = screenFixture();
  const card = f.summary(readyOffer.summary, {
    hasOfferPhoto: false, offerPhotoCount: 0,
    missingFields: ["foto real de la oferta"], disabled: true,
  });
  assert.equal(card.props.completionTitle, "Oferta incompleta");
  assert.equal(card.props.isComplete, false);
  assert.equal(card.props.primaryDisabled, true);
  assert.equal(card.props.secondaryDisabled, false);
  const busy = f.summary(readyOffer.summary, { disabled: true, loading: true });
  assert.equal(busy.props.isComplete, true);
  assert.equal(busy.props.primaryDisabled, true);
});

for (const missingFields of [[], ["foto real de la oferta"]]) {
  test(`legacy ready status cannot override incomplete readiness (${missingFields.length} missing fields)`, async () => {
    const f = screenFixture();
    f.assistant();
    f.aiCalls[0].response.resolve(aiSuccess({
      ...readyOffer, isReadyToSend: missingFields.length > 0, missingFields,
      messages: [{ id: "ready", role: "assistant", content: offerInvitation, imageUrls: [] }],
    }));
    await flush();
    assistantView(f).composer.onSend({ text: "Sí", images: [] });
    assert.equal(f.aiCalls.at(-1)!.input.uiAction, null);
    assert.equal(assistantView(f).review, undefined);
  });
}

test("blocked summary stays in chat until an uploaded photo passes readiness", async () => {
  const f = screenFixture();
  await restoreReadyOffer(f);
  assistantView(f).composer.onSend({ text: "Sí", images: [] });
  const blocked = f.aiCalls.at(-1)!;
  assert.equal(blocked.input.uiAction, "SHOW_SUMMARY");
  blocked.response.resolve(aiSuccess({ ...readyOffer, isReadyToSend: false,
    missingFields: ["foto real de la oferta"], summary: null,
    assistantMessage: "Adjunta al menos una foto real del producto que ofreces para continuar.",
  }));
  await flush();
  assert.equal(assistantView(f).review, undefined);
  assert.match(assistantView(f).messages.at(-1).text, /Adjunta al menos una foto/);
  const photo = { uri: "file:///product.png" };
  assistantView(f).composer.onSend({ text: "", images: [photo] });
  f.aiCalls.at(-1)!.response.resolve(offerFailure);
  await flush();
  assert.equal(assistantView(f).review, undefined);
  const retry = assistantView(f).tree.find((node) => node.type === "Pressable" && node.props.onPress)!;
  const retryPromise = retry.props.onPress();
  f.aiCalls.at(-1)!.response.resolve(aiSuccess({ ...readyOffer, assistantMessage: offerInvitation }));
  await retryPromise;
  await openOfferSummary(f);
  assert.ok(assistantView(f).review);
});

function assistantView(f: ReturnType<typeof screenFixture>) {
  const tree = nodes(f.assistant());
  return {
    tree,
    messages: tree.filter((n) => typeof n.type === "function" && n.type.name === "AssistantMessageBubble").map((n) => n.props.message),
    composer: tree.find((n) => n.type === "InputChat")!.props,
    review: tree.find((n) => typeof n.type === "function" && n.type.name === "OfferSummaryCard")?.props,
    progress: tree.find((n) => n.type === "Progress")?.props,
  };
}
async function restoreReadyOffer(f: ReturnType<typeof screenFixture>, messages = [
  { id: "user-photo", role: "user", content: "3 llantas, retiro en tienda", imageUrls: ["https://example.test/photo"] },
  { id: "ready", role: "assistant", content: offerInvitation, imageUrls: [] },
]) {
  f.assistant();
  f.aiCalls[0].response.resolve(aiSuccess({ ...readyOffer, messages }));
  await flush();
}
async function openOfferSummary(f: ReturnType<typeof screenFixture>, text = "Sí") {
  assistantView(f).composer.onSend({ text, images: [] });
  const call = f.aiCalls.at(-1)!;
  assert.equal(call.input.uiAction, "SHOW_SUMMARY");
  assert.equal(call.input.offerDraftId, "saved");
  assert.equal(call.input.prompt, text);
  assert.equal(assistantView(f).progress!.variant, "thinking");
  call.response.resolve(aiSuccess({ ...readyOffer, assistantMessage: offerReviewInstruction }));
  await flush();
}

test("offer review and repeated adjustment preserve the ordered transcript and scroll to its end", async () => {
  const f = screenFixture();
  await restoreReadyOffer(f);
  const scroll = assistantView(f).tree.find((n) => n.type === "ScrollView")!;
  const scrolling: string[] = [];
  scroll.props.ref.current = { scrollTo: () => scrolling.push("top"), scrollToEnd: () => scrolling.push("end") };
  await openOfferSummary(f);
  let view = assistantView(f);
  assert.deepEqual(view.messages.map((m) => m.text), ["3 llantas, retiro en tienda", offerInvitation, "Sí"]);
  assert.equal(view.review!.offerPhotoCount, 1);
  assert.equal(view.review!.disabled, false);
  view.tree.find((n) => n.type === "ScrollView")!.props.onContentSizeChange();
  assert.deepEqual(scrolling, ["end"]);
  assert.ok(view.tree.findIndex((n) => n.props === view.review) > view.tree.findLastIndex((n) => n.props.message));

  for (let cycle = 0; cycle < 2; cycle++) {
    const continuing = view.review!.onContinue();
    assert.equal(f.aiCalls.at(-1)!.input.uiAction, "CONTINUE");
    assert.ok(assistantView(f).review, "Review stays visible until CONTINUE succeeds");
    f.aiCalls.at(-1)!.response.resolve(aiSuccess({ ...readyOffer, assistantMessage: offerInvitation }));
    await continuing;
    view = assistantView(f);
    assert.equal(view.review, undefined);
    assert.equal(view.messages.filter((m) => m.text === offerInvitation).length, 1);
    assert.equal(view.messages[0].id, "user-photo");
    assert.equal(view.messages[0].images[0].uri, "https://example.test/photo");
    await openOfferSummary(f, "Ver resumen");
    view = assistantView(f);
    assert.equal(view.review!.offerPhotoCount, 1);
  }
  assert.equal(view.messages.filter((m) => m.text === "Ver resumen").length, 2, "Repeated genuine user messages remain");
});

test("failed CONTINUE preserves review and history; retry reuses the exact control identity", async () => {
  const f = screenFixture();
  await restoreReadyOffer(f);
  await openOfferSummary(f);
  const before = assistantView(f).messages;
  const continuing = assistantView(f).review!.onContinue();
  const failedCall = f.aiCalls.at(-1)!;
  failedCall.response.resolve(offerFailure);
  await continuing;
  const view = assistantView(f);
  assert.ok(view.review);
  assert.equal(view.composer.placeholder, "Escribe un cambio");
  assert.deepEqual(view.messages, before);
  const retry = view.tree.find((n) => n.type === "Pressable")!.props.onPress();
  const retryCall = f.aiCalls.at(-1)!;
  assert.equal(retryCall.input.identity, failedCall.input.identity);
  assert.equal(retryCall.input.offerDraftId, "saved");
  retryCall.response.resolve(aiSuccess({ ...readyOffer, assistantMessage: "Puedes cambiar el precio o la entrega." }));
  await retry;
  assert.equal(assistantView(f).review, undefined);
  assert.equal(assistantView(f).messages.at(-1).text, "Puedes cambiar el precio o la entrega.");
});

test("restored control announcements are filtered without deleting real replies, images, or acknowledgements", async () => {
  const f = screenFixture();
  const usefulReply = "Cambié el precio a ₡55 000. Tu oferta está lista. ¿Deseas ver el resumen?";
  await restoreReadyOffer(f, [
    { id: "photo", role: "user", content: "3 llantas", imageUrls: ["https://example.test/photo"] },
    { id: "ready", role: "assistant", content: offerInvitation, imageUrls: [] },
    { id: "old-summary", role: "assistant", content: offerReviewInstruction, imageUrls: [] },
    { id: "ack", role: "user", content: "Si", imageUrls: [] },
    { id: "continue", role: "assistant", content: offerInvitation, imageUrls: [] },
    { id: "change", role: "user", content: "Cambia el precio a 55000", imageUrls: [] },
    { id: "useful", role: "assistant", content: usefulReply, imageUrls: [] },
  ]);
  let view = assistantView(f);
  assert.deepEqual(view.messages.map((m) => m.id), ["photo", "ready", "ack", "change", "useful"]);
  assert.equal(view.review, undefined, "RESTORE does not invent a server review state");
  await openOfferSummary(f, "Ver resumen");
  view = assistantView(f);
  assert.equal(view.review!.offerPhotoCount, 1);
  assert.ok(view.messages.some((m) => m.text === usefulReply));
  view.composer.onSend({ text: "Ahora son 4", images: [] });
  f.aiCalls.at(-1)!.response.resolve(aiSuccess({ ...readyOffer, assistantMessage: offerInvitation }));
  await flush();
  view = assistantView(f);
  assert.equal(view.review, undefined);
  assert.ok(view.messages.some((m) => m.text === usefulReply));
  assert.equal(view.messages.filter((m) => m.text === offerInvitation).length, 2, "A real correction may earn a new invitation");
});

test("offer acknowledgements require an actual pending invitation and never publish or reopen a visible summary", async () => {
  for (const scenario of ["review", "guidance", "blocked", "mixed", "images"] as const) {
    const f = screenFixture();
    await restoreReadyOffer(f);
    if (scenario === "review") await openOfferSummary(f);
    if (scenario === "guidance" || scenario === "blocked") {
      assistantView(f).composer.onSend({ text: "Confirma las condiciones", images: [] });
      f.aiCalls.at(-1)!.response.resolve(aiSuccess({
        ...readyOffer,
        ...(scenario === "blocked" ? { status: "draft", isReadyToSend: false, missingFields: ["confirmacion de oferta"] } : {}),
        assistantMessage: "Para completar la oferta, necesito confirmar: confirmacion de oferta. ¿Me ayudas con ese dato?",
      }));
      await flush();
    }
    const text = scenario === "mixed" ? "Sí, pero cambia la cantidad a 4" : "Sí";
    const images = scenario === "images" ? [{ uri: "file:///new-photo.jpg" }] : [];
    assistantView(f).composer.onSend({ text, images });
    const call = f.aiCalls.at(-1)!;
    assert.equal(call.input.uiAction, null, scenario);
    assert.equal(call.input.prompt, text);
    assert.equal(call.input.images, images);
    assert.equal(call.input.offerDraftId, "saved");
    f.unmount();
  }
});

test("Bug25 seller keeps refusals and price preferences as edits after restoration and review", async () => {
  for (const reviewed of [false, true]) {
    for (const text of ["No, suave, quiero que esté barato", "No", "No gracias", "Sí, pero cambia el precio", "Ver resumen después de cambiar el precio"]) {
      const f = screenFixture();
      await restoreReadyOffer(f);
      if (reviewed) await openOfferSummary(f);
      assistantView(f).composer.onSend({ text, images: [] });
      const call = f.aiCalls.at(-1)!;
      assert.equal(call.input.uiAction, null);
      assert.equal(call.input.prompt, text);
      assert.equal(call.input.offerDraftId, "saved");
      assert.equal(assistantView(f).review, undefined);
      f.unmount();
    }
  }
});

for (const outcome of ["failed", "stopped", "unmounted"] as const) {
  test(`${outcome} offer summary preserves transcript and cannot apply a late review`, async () => {
    const f = screenFixture();
    await restoreReadyOffer(f);
    assistantView(f).composer.onSend({ text: "Sí", images: [] });
    const call = f.aiCalls.at(-1)!;
    assert.equal(call.input.uiAction, "SHOW_SUMMARY");
    const before = assistantView(f).messages;
    if (outcome === "failed") {
      call.response.resolve(offerFailure);
      await flush();
      const view = assistantView(f);
      assert.equal(view.review, undefined);
      assert.deepEqual(view.messages, before);
      const retry = view.tree.find((n) => n.type === "Pressable")!.props.onPress();
      const retryCall = f.aiCalls.at(-1)!;
      assert.equal(retryCall.input.identity, call.input.identity);
      assert.equal(retryCall.input.prompt, "Sí");
      retryCall.response.resolve(aiSuccess({ ...readyOffer, assistantMessage: "Falta confirmar el plazo de retiro." }));
      await retry;
      assert.equal(assistantView(f).messages.at(-1).text, "Falta confirmar el plazo de retiro.");
      assert.equal(assistantView(f).messages.filter((m) => m.text === "Sí").length, 1);
    } else {
      if (outcome === "stopped") assistantView(f).composer.onStop();
      else f.unmount();
      assert.equal(call.input.signal.aborted, true);
      if (outcome === "stopped") {
        assistantView(f).composer.onSend({ text: "Ahora son 4", images: [] });
      }
      call.response.resolve(aiSuccess({ ...readyOffer, offerDraftId: "stale", assistantMessage: "Respuesta tardía" }));
      await flush();
      const view = assistantView(f);
      assert.equal(view.review, undefined);
      assert.ok(!view.messages.some((m) => m.text === "Respuesta tardía"));
      assert.equal(view.messages[0].id, "user-photo");
      if (outcome === "stopped") {
        assert.equal(view.composer.busy, true);
        assert.equal(f.aiCalls.at(-1)!.input.offerDraftId, "saved");
      }
    }
  });
}

test("edit initialization blocks composition and carries the reviewed draft version to publication", async () => {
  const f = screenFixture({ mode: "edit" });
  assert.equal(assistantView(f).composer.disabled, true);
  assert.equal(f.aiCalls[0].input.mode, "edit");
  assert.equal(f.aiCalls[0].input.uiAction, "RESTORE");
  f.aiCalls[0].response.resolve(aiSuccess({ ...readyOffer, mode: "edit", uiState: "review", hasChanges: true }));
  await flush();
  const view = assistantView(f);
  assert.equal(view.composer.disabled, false);
  assert.ok(view.review);
  assert.equal(view.review.isEditMode, true);
  const pending = view.review.onPublish();
  const call = f.aiCalls.at(-1)!;
  assert.equal(call.input.mode, "edit");
  assert.equal(call.input.uiAction, "PUBLISH");
  assert.equal(call.input.expectedDraftVersion, 2);
  assert.equal(call.input.expectedOfferRevision, "published-revision");
  call.response.resolve(aiSuccess({ ...readyOffer, status: "sent" }));
  await pending;
});

test("unchanged edit review cannot publish or infer photos from transcript attachments", async () => {
  const f = screenFixture({ mode: "edit" });
  f.assistant();
  f.aiCalls[0].response.resolve(aiSuccess({ ...readyOffer, hasChanges: false, offerImages: [], uiState: "review",
    messages: [{ id: "reference-photo", role: "user", content: "Referencia", imageUrls: ["https://example.test/reference"] }] }));
  await flush();
  const review = assistantView(f).review;
  assert.ok(review);
  assert.equal(review.disabled, true);
  assert.equal(review.offerPhotoCount, 0);
  await review.onPublish();
  assert.equal(f.aiCalls.length, 1);
});

test("stale edit clears review and blocks composition and publication until restored", async () => {
  const f = screenFixture({ mode: "edit" });
  f.assistant();
  f.aiCalls[0].response.resolve(aiSuccess({ ...readyOffer, uiState: "review" }));
  await flush();
  const publish = assistantView(f).review!.onPublish();
  f.aiCalls.at(-1)!.response.resolve({ ok: false, error: { code: "offer_draft_changed", message: "Cambió" } });
  await publish;
  const view = assistantView(f);
  assert.equal(view.composer.disabled, true);
  assert.equal(view.review, undefined);
  assert.ok(view.tree.some((node) => node.props.title === "Cargar últimos cambios"));
});

test("private transcript restores an attachment-only turn after that photo was removed from the offer", () => {
  const service = load("../src/services/purchase.offer.assistant.service.ts", {
    "../lib/supabase": {}, "../lib/supabase/errors": {}, "./active.profile.service": {},
  }, "\nexport { toSuccessPayload };\n");
  const payload = service.toSuccessPayload({ mode: "edit", offer_images: [],
    signed_images: [{ storage_ref: "storage://removed", signed_url: "https://example.test/removed" }],
    messages: [{ id: "photo-turn", role: "user", content: "", metadata: { image_refs: ["storage://removed"] } }],
  }, "request-1");
  assert.equal(payload.offerImages.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(payload.messages)), [{ id: "photo-turn", role: "user", content: "", imageUrls: ["https://example.test/removed"] }]);
});

test("initial stale-offer conflict retains the authorized draft identity for discard and restart", async () => {
  const f = screenFixture({ mode: "edit" });
  f.assistant();
  f.aiCalls[0].response.resolve({ ok: false, error: { code: "offer_changed", message: "La oferta cambió" }, conflictDraftId: "old-draft", conflictDraftVersion: 4 });
  await flush();
  const view = assistantView(f);
  assert.equal(view.composer.disabled, true);
  view.tree.find((node) => node.props.title === "Descartar cambios y cargar oferta")!.props.onPress();
  const discard = f.aiCalls.at(-1)!;
  assert.equal(discard.input.uiAction, "DISCARD");
  assert.equal(discard.input.offerDraftId, "old-draft");
  assert.equal(discard.input.expectedDraftVersion, 4);
  discard.response.resolve(aiSuccess({ offerDraftId: "old-draft", status: "cancelled" }));
  await flush();
  const restore = f.aiCalls.at(-1)!;
  assert.equal(restore.input.uiAction, "RESTORE");
  assert.equal(restore.input.offerDraftId, undefined);
  restore.response.resolve(aiSuccess({ ...readyOffer, offerDraftId: "new-draft", draftVersion: 0, hasChanges: false }));
  await flush();
  assert.equal(assistantView(f).composer.disabled, false);
});

test("edit context distinguishes saved private revisions and preserves UNIT versus TOTAL pricing", () => {
  const f = screenFixture();
  const texts = (tree: Element) => nodes(tree).filter((n) => n.type === "Text").map((n) => n.props.children.flat().join(""));
  const summary = { ...readyOffer.summary, precio: 40000, cantidadOfrecida: 4, precioTotal: 160000 };
  const initial = texts(f.context({ summary }));
  assert.ok(initial.includes("Oferta actual"));
  assert.ok(initial.includes("₡40,000 × 4"));
  assert.ok(initial.includes("Total ₡160,000"));
  const revised = texts(f.context({ summary: { ...summary, basePrecio: "TOTAL", precio: 150, moneda: "USD" }, hasChanges: true }));
  assert.ok(revised.includes("Cambios propuestos"));
  assert.ok(!revised.includes("Oferta actual"));
  assert.ok(revised.includes("Total $150"));
  assert.ok(!revised.some((text) => text.includes("×")), "Total pricing must not be multiplied by quantity");
});

test("edit disclosures preserve the full buyer request, conditions, fulfillment and authoritative photos", () => {
  const f = screenFixture();
  const photos = [...readyOffer.offerImages, { storageRef: "storage://second", url: "https://example.test/second" }];
  const summary = { ...readyOffer.summary, descripcion: "Incluye alineado y tramado. ".repeat(20), entrega: "Envío", retiro: "Retiro", precioEnvio: null, envioMaximoDias: 3, retiroDespuesDeDias: 1 };
  const context = () => nodes(f.context({ summary, images: photos, reference: { ...reference, text: snapshot.repeat(20) } }));
  let tree = context();
  assert.ok(!tree.some((n) => n.props.selectable));
  assert.equal(tree.find((n) => n.type === "Image")?.props.source.uri, photos[0].url);
  const request = tree.find((n) => n.props.accessibilityLabel === "Solicitud del comprador")!;
  assert.equal(request.props.accessibilityState.expanded, false);
  request.props.onPress();
  tree = context();
  assert.equal(tree.find((n) => n.props.accessibilityLabel === "Solicitud del comprador")?.props.accessibilityState.expanded, true);
  const buyerText = tree.find((n) => n.props.selectable && n.props.children[0] === snapshot.repeat(20));
  assert.ok(buyerText);
  assert.equal(buyerText.props.maxLines, undefined);
  tree.find((n) => n.props.accessibilityLabel === "Detalles de la oferta")!.props.onPress();
  tree = context();
  assert.ok(tree.some((n) => n.props.selectable && n.props.children[0] === summary.descripcion));
  assert.ok(tree.some((n) => n.props.children?.includes("Envío · Retiro")));
  assert.ok(!tree.some((n) => n.props.children?.includes("Costo de envío")));
  assert.equal(tree.find((n) => typeof n.type === "function" && n.type.name === "OfferPhotos")?.props.images, photos);
});

test("saved edit context survives continuing or failed turns without becoming a publishable review", async () => {
  const f = screenFixture({ mode: "edit" });
  f.assistant();
  f.aiCalls[0].response.resolve(aiSuccess({ ...readyOffer, hasChanges: true, uiState: "review" }));
  await flush();
  const context = () => nodes(f.assistant()).find((n) => typeof n.type === "function" && n.type.name === "OfferEditContext")!.props;
  assert.equal(context().hasChanges, true);
  assert.equal(context().summary, readyOffer.summary);
  const continueRequest = assistantView(f).review!.onContinue();
  f.aiCalls.at(-1)!.response.resolve(aiSuccess({ ...readyOffer, uiState: "normal" }));
  await continueRequest;
  assert.equal(context().summary, readyOffer.summary);
  assert.equal(assistantView(f).review, undefined);
  assistantView(f).composer.onSend({ text: "Cambia el precio", images: [] });
  f.aiCalls.at(-1)!.response.resolve(offerFailure);
  await flush();
  assert.equal(context().summary, readyOffer.summary);
  assert.equal(assistantView(f).review, undefined);
});

test("edit disclosures do not trigger transcript scrolling, but incoming responses do", async () => {
  const f = screenFixture({ mode: "edit" });
  f.assistant();
  f.aiCalls[0].response.resolve(aiSuccess({ ...readyOffer, messages: [{ id: "old", role: "user", content: "Mensaje guardado", imageUrls: [] }] }));
  await flush();
  let scrolls = 0;
  const scroll = () => nodes(f.assistant()).find((n) => n.type === "ScrollView")!.props;
  scroll().ref.current = { scrollToEnd: () => { scrolls++; } };
  scroll().onContentSizeChange();
  scroll().onContentSizeChange();
  assert.equal(scrolls, 1, "Expanding content alone must not jump to the end");
  assistantView(f).composer.onSend({ text: "Cambia el precio", images: [] });
  scroll().onContentSizeChange();
  assert.equal(scrolls, 2);
  f.aiCalls.at(-1)!.response.resolve(aiSuccess({ ...readyOffer, assistantMessage: "Precio cambiado." }));
  await flush();
  scroll().onContentSizeChange();
  assert.equal(scrolls, 3);
});

test("exit popup can be dismissed to keep editing; leaving retains the draft and discard is explicit", async () => {
  for (const action of ["exit-offer", "discard-draft"]) {
    const f = screenFixture({ mode: "edit" });
    let exitGuard: any;
    let popup: any;
    const navigations: any[] = [];
    f.modules["@react-navigation/native"].useNavigation = () => ({ dispatch: (value: any) => navigations.push(value) });
    f.modules["@react-navigation/native"].usePreventRemove = (enabled: boolean, callback: Function) => { exitGuard = { enabled, callback }; };
    f.modules["@/src/services/popup.service"].openPopup = (value: any) => { popup = value; };
    f.assistant();
    f.aiCalls[0].response.resolve(aiSuccess({ ...readyOffer }));
    await flush();
    f.assistant();
    assert.equal(exitGuard.enabled, true);
    exitGuard.callback({ data: { action: "go-back" } });
    assert.equal(popup.dismissOnBackdropPress, true);
    assert.equal(popup.showCloseButton, true);
    assert.equal(popup.actions.length, 2);
    assert.equal(popup.actions.find((a: any) => a.id === "discard-draft").label, "Descartar");
    assert.equal(f.aiCalls.length, 1, "Opening or dismissing the popup makes no draft mutation");
    assert.equal(navigations.length, 0);
    const result = popup.actions.find((a: any) => a.id === action).onPress();
    if (action === "discard-draft") {
      const discard = f.aiCalls.at(-1)!;
      assert.equal(discard.input.uiAction, "DISCARD");
      assert.equal(discard.input.expectedDraftVersion, 2);
      discard.response.resolve(aiSuccess({ status: "cancelled" }));
      await result;
    } else assert.equal(f.aiCalls.length, 1, "Leaving must never discard or publish");
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.deepEqual(navigations, ["go-back"]);
    f.assistant();
    assert.equal(exitGuard.enabled, false);
  }
});

test("exit popup warns about unsent composer content on iOS as well as Android", async () => {
  for (const os of ["ios", "android"]) {
    const f = screenFixture({ mode: "edit" });
    let exitGuard: Function;
    let popup: any;
    f.modules["react-native"].Platform.OS = os;
    f.modules["@react-navigation/native"].usePreventRemove = (_enabled: boolean, callback: Function) => { exitGuard = callback; };
    f.modules["@/src/services/popup.service"].openPopup = (value: any) => { popup = value; };
    f.assistant();
    f.aiCalls[0].response.resolve(aiSuccess({ ...readyOffer }));
    await flush();
    assistantView(f).composer.onDraftChange(true);
    f.assistant();
    exitGuard!({ data: { action: "go-back" } });
    assert.match(popup.description, /todavía no hayas enviado se perderán/);
  }
});
