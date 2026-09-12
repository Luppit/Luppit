import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as assistantSummaryReply from "../src/utils/assistantSummaryReply.ts";
import * as purchaseRequestReadiness from "../src/utils/purchaseRequestReadiness.ts";
import type { InputChatProps } from "../src/components/inputChat/inputChat";
import type { ChatSessionProvider, useChatSession } from "../app/(chat)/chat-session.context";
import type { callPurchaseRequestAssistant } from "../src/services/purchase.request.assistant.service";

// Run the actual callbacks with controlled hooks and deferred network responses.
// This does not exercise native layout or React scheduling.
function createHooks() {
  const values: unknown[] = [];
  const cleanups = new Map<number, () => void>();
  let cursor = 0;
  const memo = (callback: () => unknown, dependencies: unknown[] = []) => {
    const index = cursor++;
    const previous = values[index] as { dependencies: unknown[]; value: unknown } | undefined;
    if (previous && dependencies.length === previous.dependencies.length && dependencies.every((value, position) => Object.is(value, previous.dependencies[position]))) return previous.value;
    const value = callback(); values[index] = { dependencies, value }; return value;
  };
  const hooks = {
    createContext: () => ({ Provider: "Provider" }),
    createElement: (type: unknown, props: object, ...children: unknown[]) => ({
      type, props: { ...props, children },
    }),
    useState: (initial: unknown) => {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], (next: unknown) => {
        values[index] = typeof next === "function" ? next(values[index]) : next;
      }];
    },
    useRef: (initial: unknown) => {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useCallback: (callback: unknown, dependencies: unknown[]) => memo(() => callback, dependencies),
    useMemo: memo,
    useEffect: (callback: () => (() => void) | void, dependencies: unknown[] = []) => {
      const index = cursor++;
      const previous = values[index] as unknown[] | undefined;
      if (previous && dependencies.length === previous.length &&
        dependencies.every((value, position) => Object.is(value, previous[position]))) return;
      cleanups.get(index)?.();
      cleanups.delete(index);
      values[index] = dependencies;
      const cleanup = callback();
      if (cleanup) cleanups.set(index, cleanup);
    },
  };
  return {
    hooks,
    render<T>(component: () => T) { cursor = 0; return component(); },
    unmount() { cleanups.forEach((cleanup) => cleanup()); },
  };
}

function loadComponent<T>(path: string, modules: Record<string, unknown>, expose?: string): T {
  let source = readFileSync(new URL(path, import.meta.url), "utf8");
  if (expose) source = source.replace(`function ${expose}(`, `export function ${expose}(`);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, AbortController, console,
    React: modules.react,
    require(name: string) {
      assert.ok(name in modules, `Unmocked import: ${name}`);
      return modules[name];
    },
  });
  return exports as T;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

type Result = Awaited<ReturnType<typeof callPurchaseRequestAssistant>>;
function success(overrides: Partial<Extract<Result, { ok: true }>> = {}): Result {
  return {
    ok: true, messages: [], draftId: "draft-1", status: "draft", uiState: "normal",
    pendingAction: null, requiredFields: [], optionalFields: [], missingFields: [],
    categorySuggestions: [], summary: null, summaryText: null,
    purchaseRequestId: null, assistantMessage: "¿Qué medida necesitas?",
    updatedAt: null, isReadyToPublish: false, interactionType: "BUILD",
    controlAction: null, requestId: null, ...overrides,
  };
}

async function createSession(options: { restore?: Result | false } = {}) {
  const runtime = createHooks();
  let identitySequence = 0;
  const calls: { input: Parameters<typeof callPurchaseRequestAssistant>[0]; response: ReturnType<typeof deferred<Result>> }[] = [];
  const errors: unknown[][] = [];
  const announcements: string[] = [];
  const module = loadComponent<{ ChatSessionProvider: typeof ChatSessionProvider }>(
    "../app/(chat)/chat-session.context.tsx",
    {
      react: runtime.hooks,
      "../../src/utils/assistantSummaryReply": assistantSummaryReply,
      "../../src/utils/purchaseRequestReadiness": purchaseRequestReadiness,
      "react-native": { AccessibilityInfo: { announceForAccessibility: (text: string) => announcements.push(text) } },
      "expo-router": { router: { replace() {} } },
      "@/src/services/popup.service": { openPopup() {} },
      "@/src/utils/useToast": { showError: (...args: unknown[]) => errors.push(args), showWarning() {} },
      "@/src/services/purchase.request.assistant.service": {
        callPurchaseRequestAssistant: (input: Parameters<typeof callPurchaseRequestAssistant>[0]) => {
          const response = deferred<Result>();
          calls.push({ input, response });
          return response.promise;
        },
        createPurchaseRequestAssistantRequestIdentity: () => {
          const sequence = ++identitySequence;
          return {
            client_request_id: `test-request-${sequence}`,
            idempotency_key: `test-idempotency-${sequence}`,
          };
        },
      },
    },
  );
  const session = {
    calls, errors, announcements, unmount: runtime.unmount,
    get state() {
      return runtime.render(() => module.ChatSessionProvider({ children: null })).props.value as ReturnType<typeof useChatSession>;
    },
  };
  if (options.restore !== false) {
    void session.state;
    calls[0].response.resolve(options.restore ?? success({ draftId: null, status: null, assistantMessage: null }));
    await new Promise<void>((resolve) => setImmediate(resolve));
    calls.splice(0);
  }
  return session;
}

type Element = { type: string; props: Record<string, any> };
function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const element = value as Element;
  return [element, ...elements(element.props.children)];
}

function createChatView(session: Awaited<ReturnType<typeof createSession>>) {
  const runtime = createHooks();
  const module = loadComponent<{ default: () => Element }>(
    "../app/(chat)/chat.tsx",
    {
      react: runtime.hooks,
      "react-native": Object.fromEntries(["ActivityIndicator", "Image", "ScrollView", "View"].map((name) => [name, name])),
      "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0 }) },
      "@/src/themes": { useTheme: () => ({ spacing: {} }) },
      "./chat-session.context": { useChatSession: () => session.state },
      "./chat-top-bar": { CHAT_TOP_BAR_VISIBLE_HEIGHT: 44 },
      "@/src/components/button/Button": "Button",
      "@/src/components/assistant/AssistantProcessingProgress": "Progress",
      "@/src/components/assistant/AssistantReviewCard": "ReviewCard",
      "@/src/components/BundledSvg": { BundledSvg: "BundledSvg" },
      "@/src/components/message/MessageUtilities": "MessageUtilities",
      "@/src/components/Text": { Text: "Text" },
      "@/src/utils/purchaseRequestSummary": {},
    },
  );
  return () => elements(runtime.render(() => module.default())).find((node) => node.type === "Progress")?.props;
}

function createComposer(initial: Partial<InputChatProps> = {}) {
  const runtime = createHooks();
  let props: InputChatProps = { onSend() {}, ...initial };
  const module = loadComponent<{ default: (props: InputChatProps) => Element }>(
    "../src/components/inputChat/inputChat.tsx",
    {
      react: runtime.hooks,
      "react-native": Object.fromEntries(["Image", "Pressable", "ScrollView", "Text", "TextInput", "View"].map((name) => [name, name])),
      "expo-image-picker": {},
      "lucide-react-native": { ArrowUp: "ArrowUp", Square: "Square", X: "X", Paperclip: "Paperclip" },
      "@/src/themes": { useTheme: () => ({ colors: {} }) },
      "./styles": { createInputChatStyles: () => ({}) },
    },
  );
  const tree = () => elements(runtime.render(() => module.default(props)));
  return {
    update(next: Partial<InputChatProps>) { props = { ...props, ...next }; },
    get input() { return tree().find((node) => node.type === "TextInput")!.props; },
    get action() { return tree().find((node) => ["Enviar mensaje", "Detener respuesta"].includes(node.props.accessibilityLabel))!.props; },
    get nodes() { return tree(); },
  };
}

test("buyer composer can stop with empty text while disabled, then restores normal send rules", () => {
  let stopped = 0;
  const composer = createComposer({ busy: true, disabled: true, maxImages: 3, onStop: () => stopped++ });
  assert.equal(composer.action.accessibilityLabel, "Detener respuesta");
  assert.equal(composer.action.disabled, false);
  assert.equal(composer.action.accessibilityState.disabled, false);
  assert.equal(composer.input.editable, false);
  assert.ok(composer.nodes.some((node) => node.type === "Square"));
  assert.equal(composer.nodes.find((node) => node.props.accessibilityLabel === "Adjuntar imágenes")!.props.disabled, true);
  composer.action.onPress();
  assert.equal(stopped, 1);
  composer.update({ busy: false, disabled: false });
  assert.equal(composer.action.accessibilityLabel, "Enviar mensaje");
  assert.equal(composer.action.disabled, true);
  assert.ok(composer.nodes.some((node) => node.type === "ArrowUp"));
  composer.input.onChangeText("Siguiente mensaje");
  assert.equal(composer.action.disabled, false);
  composer.update({ disabled: true });
  assert.equal(composer.action.disabled, true);
});

test("non-cancellable shared callers retain the disabled send arrow while busy", () => {
  const composer = createComposer({ busy: true });
  assert.equal(composer.action.accessibilityLabel, "Enviar mensaje");
  assert.equal(composer.action.disabled, true);
  assert.ok(composer.nodes.some((node) => node.type === "ArrowUp"));
  assert.ok(!composer.nodes.some((node) => node.type === "Square"));
});

test("composer reports unsaved content and keeps the leave guard active until sending finishes", async () => {
  const changes: boolean[] = [];
  const pending = deferred<void>();
  const composer = createComposer({
    clearOnSendStart: true,
    onDraftChange: (hasDraft) => changes.push(hasDraft),
    onSend: () => pending.promise,
  });
  composer.input.onChangeText("Solicitud sin enviar");
  void composer.nodes;
  assert.equal(changes.at(-1), true);
  const sent = composer.action.onPress();
  assert.equal(composer.input.value, "");
  assert.equal(changes.at(-1), true);
  pending.resolve();
  await sent;
  void composer.nodes;
  assert.equal(changes.at(-1), false);
});

test("shared conversation callers can still preview and send an image without text", async () => {
  const image = { uri: "file:///test-image.jpg" };
  let payload: Parameters<InputChatProps["onSend"]>[0] | undefined;
  const composer = createComposer({
    onPickImages: () => [image],
    onSend: (next) => { payload = next; },
  });
  const attachment = composer.nodes.find((node) => node.props.accessibilityLabel === "Adjuntar imágenes")!;
  await attachment.props.onPress();
  assert.equal(composer.nodes.find((node) => node.type === "Image")!.props.source.uri, image.uri);
  assert.equal(composer.action.disabled, false);
  await composer.action.onPress();
  assert.equal(payload?.text, "");
  assert.equal(payload?.images[0].uri, image.uri);
  assert.ok(!composer.nodes.some((node) => node.type === "Image"));
  assert.equal(composer.action.disabled, true);
});

test("stopping an unresolved send permits another send; old completion cannot clear or unlock it", async () => {
  const first = deferred<void>();
  const second = deferred<void>();
  let count = 0;
  const composer = createComposer({ onSend: () => (++count === 1 ? first.promise : second.promise), onStop() {} });
  composer.input.onChangeText("Primero");
  const firstSend = composer.action.onPress();
  composer.action.onPress();
  composer.input.onChangeText("Segundo");
  const secondSend = composer.action.onPress();
  first.resolve();
  await firstSend;
  assert.equal(composer.input.value, "Segundo");
  assert.equal(composer.action.accessibilityLabel, "Detener respuesta");
  second.resolve();
  await secondSend;
  assert.equal(composer.input.value, "");
  assert.equal(composer.action.disabled, true);
});

test("composer releases its internal busy state when sending throws", async () => {
  const response = deferred<void>();
  const composer = createComposer({ onSend: () => response.promise, onStop() {} });
  composer.input.onChangeText("Llantas");
  const sending = composer.action.onPress();
  response.reject(new Error("network failed"));
  await assert.rejects(sending, /network failed/);
  assert.equal(composer.action.accessibilityLabel, "Enviar mensaje");
  assert.equal(composer.action.disabled, false);
  assert.equal(composer.input.value, "Llantas");
});

test("completion restores compose and records the assistant reply and draft", async () => {
  const session = await createSession();
  const progress = createChatView(session);
  const pending = session.state.sendMessage({ text: "Llantas", images: [] });
  assert.equal(session.state.isSendingMessage, true);
  assert.equal(session.state.canCompose, false);
  assert.equal(progress()!.variant, "thinking");
  assert.equal(progress()!.onStop, undefined);
  session.calls[0].response.resolve(success());
  await pending;
  assert.equal(progress(), undefined);
  assert.equal(session.state.isSendingMessage, false);
  assert.equal(session.state.canCompose, true);
  assert.equal(session.state.draftId, "draft-1");
  assert.equal(session.state.messages.length, 2);
});

test("stop immediately unlocks compose and ignores a late successful reply", async () => {
  const session = await createSession();
  const pending = session.state.sendMessage({ text: "Llantas", images: [] });
  session.state.stopAssistant();
  assert.equal(session.calls[0].input.signal!.aborted, true);
  assert.equal(session.state.canCompose, true);
  assert.equal(session.state.isSendingMessage, false);
  assert.deepEqual(session.announcements, ["Respuesta detenida"]);
  session.calls[0].response.resolve(success());
  await pending;
  assert.equal(session.state.draftId, null);
  assert.equal(session.state.messages.length, 1);
});

test("late cancelled failure cannot show an error or reset a newer request", async () => {
  const session = await createSession();
  const first = session.state.sendMessage({ text: "Primero", images: [] });
  session.state.stopAssistant();
  const second = session.state.sendMessage({ text: "Segundo", images: [] });
  session.calls[0].response.resolve({ ok: false, error: { code: "AI_TEMPORARILY_UNAVAILABLE", message: "Intenta de nuevo" } } as Result);
  await first;
  assert.equal(session.state.isSendingMessage, true);
  assert.equal(session.state.canCompose, false);
  assert.equal(session.errors.length, 0);
  session.calls[1].response.resolve(success());
  await second;
  assert.equal(session.state.canCompose, true);
  assert.equal(session.state.messages.length, 3);
});

test("service failure restores compose and preserves the failed request for retry", async () => {
  const session = await createSession();
  const pending = session.state.sendMessage({ text: "Llantas", images: [] });
  session.calls[0].response.resolve({ ok: false, error: { code: "AI_TEMPORARILY_UNAVAILABLE", message: "Intenta de nuevo" } } as Result);
  await pending;
  assert.equal(session.state.canCompose, true);
  assert.equal(session.errors.length, 1);
  const failed = session.state.messages[0];
  assert.equal(failed.failedRequests?.length, 1);
  const retry = session.state.retryMessage(failed.id);
  assert.equal(session.state.isSendingMessage, true);
  session.calls[1].response.resolve(success());
  await retry;
  assert.equal(session.state.messages[0].failedRequests, undefined);
  assert.equal(session.state.canCompose, true);
});

test("stop between CONTINUE and the follow-up request prevents the next network call", async () => {
  const session = await createSession();
  const initial = session.state.sendMessage({ text: "Llantas", images: [] });
  session.calls[0].response.resolve(success({ status: "ready", uiState: "review" }));
  await initial;
  const pending = session.state.sendMessage({ text: "Cambiar medida", images: [] });
  assert.equal(session.calls[1].input.ui_action, "CONTINUE");
  session.calls[1].response.resolve(success());
  // Let the CONTINUE response synchronize, then stop before its awaited continuation.
  await Promise.resolve();
  session.state.stopAssistant();
  assert.equal(session.state.canCompose, true);
  await pending;
  assert.equal(session.calls.length, 2);
  assert.equal(session.state.messages.length, 3);
});

test("CONTINUE forwards the latest draft ID and retry preserves the dispatched payload", async () => {
  const session = await createSession();
  const initial = session.state.sendMessage({ text: "Llantas", images: [] });
  session.calls[0].response.resolve(success({ status: "ready", uiState: "review" }));
  await initial;

  const pending = session.state.sendMessage({ text: "Cambiar medida", images: [] });
  session.calls[1].response.resolve(success({ draftId: "draft-latest" }));
  await new Promise<void>((resolve) => setImmediate(resolve));
  const followUp = session.calls[2].input;
  assert.equal(followUp.draft_id, "draft-latest");
  session.calls[2].response.resolve({
    ok: false,
    error: { type: "network", message: "Intenta de nuevo" },
    statusCode: 503, requestId: null, retryAfterSeconds: null, backendMessage: null,
  });
  await pending;

  const failed = session.state.messages.at(-1)!;
  assert.equal(failed.failedRequests?.[0].draft_id, "draft-latest");
  const retry = session.state.retryMessage(failed.id);
  assert.equal(session.calls[3].input.draft_id, followUp.draft_id);
  assert.equal(session.calls[3].input.prompt, followUp.prompt);
  assert.equal(session.calls[3].input.client_request_id, followUp.client_request_id);
  assert.equal(session.calls[3].input.idempotency_key, followUp.idempotency_key);
  session.calls[3].response.resolve(success({ draftId: "draft-latest" }));
  await retry;
  assert.equal(session.state.draftId, "draft-latest");
});

test("a response without draft_id preserves the latest successful draft for the next turn", async () => {
  const session = await createSession();
  const initial = session.state.sendMessage({ text: "Llantas", images: [] });
  session.calls[0].response.resolve(success());
  await initial;
  const answer = session.state.sendMessage({ text: "Una consulta", images: [] });
  session.calls[1].response.resolve(success({ draftId: null }));
  await answer;
  assert.equal(session.state.draftId, "draft-1");

  const followUp = session.state.sendMessage({ text: "Cantidad 4", images: [] });
  assert.equal(session.calls[2].input.draft_id, "draft-1");
  session.calls[2].response.resolve(success());
  await followUp;
});

test("a published CONTINUE response stops the queued correction", async () => {
  const session = await createSession();
  const initial = session.state.sendMessage({ text: "Llantas", images: [] });
  session.calls[0].response.resolve(success({ status: "ready", uiState: "review" }));
  await initial;
  const pending = session.state.sendMessage({ text: "Cantidad 4", images: [] });
  session.calls[1].response.resolve(success({
    status: "published", uiState: "published", purchaseRequestId: "request-1",
  }));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(session.calls.length, 2);
  await pending;
  assert.equal(session.state.canCompose, false);
  assert.equal(session.state.isSendingMessage, false);
});

test("summary cancellation releases both loading states and ignores a late review result", async () => {
  const session = await createSession();
  const progress = createChatView(session);
  const initial = session.state.sendMessage({ text: "Llantas", images: [] });
  session.calls[0].response.resolve(success({ status: "ready", pendingAction: "ASK_SHOW_SUMMARY" }));
  await initial;
  const summary = session.state.sendMessage({ text: "Ver resumen", images: [] });
  assert.equal(session.state.isGeneratingSummary, true);
  assert.equal(progress()!.variant, "thinking");
  assert.equal(progress()!.steps.length, 0);
  assert.equal(progress()!.onStop, undefined);
  session.state.stopAssistant();
  assert.equal(session.calls[1].input.signal!.aborted, true);
  assert.equal(session.state.isGeneratingSummary, false);
  assert.equal(progress(), undefined);
  session.calls[1].response.resolve(success({ status: "ready", uiState: "review" }));
  await summary;
  assert.equal(session.state.uiState, "normal");
  assert.equal(session.state.canCompose, true);

  const retry = session.state.retryMessage(session.state.messages.at(-1)!.id);
  assert.equal(session.calls[2].input.ui_action, "SHOW_SUMMARY");
  assert.equal(session.calls[2].input.idempotency_key, session.calls[1].input.idempotency_key);
  assert.equal(progress()!.variant, "thinking");
  session.calls[2].response.resolve(success({ status: "ready", uiState: "review" }));
  await retry;
  assert.equal(session.state.uiState, "review");
  assert.equal(progress(), undefined);
});

test("unmount aborts the request and prevents a late reply", async () => {
  const session = await createSession();
  const pending = session.state.sendMessage({ text: "Llantas", images: [] });
  session.unmount();
  assert.equal(session.calls[0].input.signal!.aborted, true);
  session.calls[0].response.resolve(success());
  await pending;
  assert.equal(session.state.messages.length, 1);
});

test("pending summary acceptance opens backend review and retains the draft summary", async () => {
  for (const reply of ["Si", "Sí", "Sí, por favor"]) {
    const session = await createSession();
    const progress = createChatView(session);
    const initial = session.state.sendMessage({ text: "2", images: [] });
    session.calls[0].response.resolve(success({ status: "ready", pendingAction: "ASK_SHOW_SUMMARY", isReadyToPublish: true }));
    await initial;
    const pending = session.state.sendMessage({ text: reply, images: [] });
    assert.equal(session.calls[1].input.ui_action, "SHOW_SUMMARY");
    assert.equal(session.calls[1].input.draft_id, "draft-1");
    assert.equal(session.state.uiState, "normal", "review waits for backend confirmation");
    assert.equal(progress()!.variant, "thinking");
    session.calls[1].response.resolve(success({ status: "ready", uiState: "review", isReadyToPublish: true, assistantMessage: null, summary: { titulo: "Llantas", categoria: "Llantas", marca: [], atributos: { cantidad: 2 } }, summaryText: "2 llantas" }));
    await pending;
    assert.equal(progress(), undefined);
    assert.equal(session.state.uiState, "review");
    assert.equal(session.state.summary?.atributos?.cantidad, 2);
    assert.equal(session.state.canPublish, true);
    assert.equal(session.calls.length, 2);
  }
});

for (const text of ["Mentira quiero 4", "Ocupo con una presión específica, pero no conozco mucho del tema, me ayudas?", "Sí, pero quiero 4"]) {
  test(`ready/review follow-up reaches the authoritative assistant: ${text}`, async () => {
    for (const uiState of ["normal", "review"] as const) {
      const session = await createSession();
      const initial = session.state.sendMessage({ text: "2", images: [] });
      session.calls[0].response.resolve(success({ status: "ready", uiState, pendingAction: uiState === "review" ? null : "ASK_SHOW_SUMMARY" }));
      await initial;
      const pending = session.state.sendMessage({ text, images: [] });
      if (uiState === "review") {
        assert.equal(session.calls[1].input.ui_action, "CONTINUE");
        assert.equal(session.calls[1].input.draft_id, "draft-1");
        session.calls[1].response.resolve(success({ status: "ready", uiState: "normal", assistantMessage: null }));
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      const call = session.calls.at(-1)!;
      assert.equal(call.input.ui_action, undefined);
      assert.equal(call.input.prompt, text);
      assert.equal(call.input.draft_id, "draft-1");
      const answer = text.includes("presión") ? "La presión depende del vehículo. ¿Qué modelo y año es?" : "Actualicé la cantidad a 4. ¿Deseas ver el resumen?";
      call.response.resolve(success({ status: "ready", assistantMessage: answer, pendingAction: text.includes("presión") ? null : "ASK_SHOW_SUMMARY" }));
      await pending;
      assert.equal(session.state.messages.at(-1)?.text, answer);
      assert.equal(session.state.draftId, "draft-1");
      assert.equal(session.state.uiState, "normal");
    }
  });
}

for (const text of ["", "Quiero 4 como estas", "Sí"]) {
  test(`buyer sends image content without inventing text or treating it as a summary control: ${text || "image only"}`, async () => {
    const session = await createSession();
    const initial = session.state.sendMessage({ text: "Llantas", images: [] });
    session.calls[0].response.resolve(success({ status: "ready", pendingAction: "ASK_SHOW_SUMMARY" }));
    await initial;
    const images = [{ uri: "file:///tire.jpg", mime: "image/jpeg", size: 1024 }];
    const pending = session.state.sendMessage({ text, images });
    const call = session.calls[1];
    assert.equal(call.input.prompt, text);
    assert.equal(call.input.ui_action, undefined);
    assert.equal(call.input.draft_id, "draft-1");
    assert.deepEqual(call.input.images, images);
    assert.deepEqual(session.state.messages.at(-1)?.images, images);
    call.response.resolve(success());
    await pending;
    assert.equal(session.state.draftId, "draft-1");
  });
}

test("buyer upload failure and stop retain the original image request for retry", async () => {
  for (const stop of [false, true]) {
    const session = await createSession();
    const images = [{ uri: "file:///tire.jpg", mime: "image/jpeg", size: 1024 }];
    const pending = session.state.sendMessage({ text: "", images });
    const original = session.calls[0].input;
    if (stop) session.state.stopAssistant();
    session.calls[0].response.resolve({
      ok: false, error: { type: "network", message: "No se pudo subir la imagen." },
      statusCode: 500, requestId: null, retryAfterSeconds: null, backendMessage: null,
    });
    await pending;
    assert.equal(session.state.messages.length, 1);
    assert.deepEqual(session.state.messages[0].images, images);
    const retry = session.state.retryMessage(session.state.messages[0].id);
    assert.equal(session.calls[1].input.client_request_id, original.client_request_id);
    assert.equal(session.calls[1].input.idempotency_key, original.idempotency_key);
    assert.equal(session.calls[1].input.prompt, "");
    assert.deepEqual(session.calls[1].input.images, images);
    assert.equal(session.calls[1].input.signal!.aborted, false);
    session.calls[1].response.resolve(success());
    await retry;
    assert.equal(session.state.messages[0].failedRequests, undefined);
    assert.equal(session.state.messages.filter((message) => message.sender === "user").length, 1);
  }
});

test("buyer image composer removes a preview before sending and caps selection at three", async () => {
  const images = [1, 2, 3, 4].map((index) => ({ uri: `file:///image-${index}.jpg` }));
  let payload: Parameters<InputChatProps["onSend"]>[0] | undefined;
  const composer = createComposer({
    maxImages: 3,
    onPickImages: () => images,
    onSend: (next) => { payload = next; },
  });
  await composer.nodes.find((node) => node.props.accessibilityLabel === "Adjuntar imágenes")!.props.onPress();
  assert.equal(composer.nodes.filter((node) => node.type === "Image").length, 3);
  composer.nodes.find((node) => node.props.accessibilityLabel === "Quitar imagen")!.props.onPress();
  composer.input.onChangeText("Con este estilo");
  await composer.action.onPress();
  assert.equal(payload?.text, "Con este estilo");
  assert.deepEqual(Array.from(payload?.images ?? []), images.slice(1, 3));
  assert.equal(composer.nodes.filter((node) => node.type === "Image").length, 0);
});


test("entry restores the server transcript, review state and ID before controls or follow-ups", async () => {
  const restored = success({ draftId: "saved", status: "ready", uiState: "review", isReadyToPublish: true,
    summary: { titulo: "Llantas", categoria: null, marca: [], atributos: { cantidad: 4 } },
    summaryText: "Cuatro llantas", messages: [
      { id: "persisted-user", role: "user", content: "Cuatro llantas", imageUrls: ["https://example.test/fresh-image"], metadata: {} },
      { id: "persisted-assistant", role: "assistant", content: "¿Qué medida necesitas?", imageUrls: [], metadata: {} },
    ],
  });
  const session = await createSession({ restore: restored });
  assert.equal(session.state.draftId, "saved");
  assert.equal(session.state.canPublish, true);
  assert.equal(session.state.messages.length, 2);
  assert.equal(session.state.messages[0].id, "persisted-user");
  assert.equal(session.state.messages[0].images?.[0].uri, "https://example.test/fresh-image");
  assert.equal(session.state.summaryText, "Cuatro llantas");
  const publish = session.state.publishDraft();
  assert.equal(session.calls[0].input.draft_id, "saved");
  assert.equal(session.calls[0].input.ui_action, "PUBLISH");
  session.calls[0].response.resolve(success({ draftId: "saved", status: "published", uiState: "published", purchaseRequestId: "request-1" }));
  await publish;
  assert.equal(session.state.canPublish, false);
});

test("RESTORE failure including an old server keeps compose blocked until successful retry", async () => {
  const session = await createSession({ restore: { ok: false, error: { type: "validation", message: "ui_action inválido." }, statusCode: 400, requestId: null, retryAfterSeconds: null, backendMessage: null } });
  assert.equal(session.state.canCompose, false);
  assert.equal(session.state.sessionError, "ui_action inválido.");
  await session.state.sendMessage({ text: "Llantas", images: [] });
  assert.equal(session.calls.length, 0);
  const retry = session.state.restoreDraft();
  assert.equal(session.calls[0].input.ui_action, "RESTORE");
  assert.equal(session.state.isRestoring, true);
  session.calls[0].response.resolve(success({ draftId: null, status: null, assistantMessage: null }));
  await retry;
  assert.equal(session.state.canCompose, true);
  assert.equal(session.state.sessionError, null);
  assert.equal(session.state.messages.length, 0);
});

test("leaving during RESTORE aborts and ignores its late saved transcript", async () => {
  const session = await createSession({ restore: false });
  assert.equal(session.state.canCompose, false);
  session.unmount();
  assert.equal(session.calls[0].input.signal?.aborted, true);
  session.calls[0].response.resolve(success({ draftId: "old-profile-draft" }));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(session.state.draftId, null);
  assert.equal(session.state.messages.length, 0);
});

test("discard preserves state on failure, reuses retry identity, and clears only after cancellation", async () => {
  const session = await createSession({ restore: success({ draftId: "saved" }) });
  const discard = session.state.discardDraft();
  const input = session.calls[0].input;
  session.calls[0].response.resolve({ ok: false, error: { type: "network", message: "Sin conexión" }, statusCode: null, requestId: null, retryAfterSeconds: null, backendMessage: null });
  assert.equal(await discard, false);
  assert.equal(session.state.draftId, "saved");
  const retry = session.state.discardDraft();
  assert.equal(session.calls[1].input.draft_id, "saved");
  assert.equal(session.calls[1].input.client_request_id, input.client_request_id);
  assert.equal(session.calls[1].input.idempotency_key, input.idempotency_key);
  session.calls[1].response.resolve(success({ draftId: "saved", status: "cancelled", uiState: "cancelled", assistantMessage: null }));
  assert.equal(await retry, true);
  assert.equal(session.state.draftId, null);
  assert.equal(session.state.messages.length, 0);
  assert.equal(session.state.showComposer, false);
});

test("late control completion after unmount cannot apply publication", async () => {
  const session = await createSession({ restore: success({ draftId: "saved", status: "ready", uiState: "review", isReadyToPublish: true }) });
  const publish = session.state.publishDraft();
  session.unmount();
  assert.equal(session.calls[0].input.signal?.aborted, true);
  session.calls[0].response.resolve(success({ status: "published", uiState: "published", purchaseRequestId: "request-1" }));
  await publish;
  assert.equal(session.state.purchaseRequestId, null);
});

test("an unsupported restored draft stays blocked but can be explicitly discarded", async () => {
  const session = await createSession({ restore: { ok: false, recoverableDraftId: "legacy", error: { type: "validation", code: "REQUEST_DRAFT_UNSUPPORTED", message: "Usa Descartar al salir" }, statusCode: 409, requestId: null, retryAfterSeconds: null, backendMessage: null } });
  assert.equal(session.state.draftId, "legacy");
  assert.equal(session.state.canCompose, false);
  assert.equal(session.state.canPublish, false);
  await session.state.publishDraft();
  await session.state.continueClarifying();
  assert.equal(session.calls.length, 0);
  const discard = session.state.discardDraft();
  assert.equal(session.calls[0].input.draft_id, "legacy");
  assert.equal(session.calls[0].input.ui_action, "DISCARD");
  session.calls[0].response.resolve(success({ draftId: "legacy", status: "cancelled", uiState: "cancelled", assistantMessage: null }));
  assert.equal(await discard, true);
  assert.equal(session.state.draftId, null);
});

function createLeaveLayout(platform: "ios" | "android") {
  const runtime = createHooks();
  const state: Record<string, any> = { title: "Crear solicitud", messages: [], uiState: "normal", status: "ready", draftId: "saved", showComposer: true, canCompose: true, isSendingMessage: false, isExecutingControl: false, isRestoring: false, discardDraft: async () => discardResult };
  let discardResult = false;
  let popup: any;
  let prevented = false;
  let onPrevent: any;
  let hasPopup = false;
  const dispatched: unknown[] = [];
  const dismissals: unknown[] = [];
  const androidGuards: unknown[][] = [];
  const navigation = { dispatch: (action: unknown) => dispatched.push(action) };
  const module = loadComponent<{ ChatLayoutContent: () => Element }>("../app/(chat)/_layout.tsx", {
    react: runtime.hooks,
    "@react-navigation/native": { useNavigation: () => navigation, usePreventRemove: (enabled: boolean, callback: unknown) => { prevented = enabled; onPrevent = callback; } },
    "@/src/components/profile/ActiveProfileContext": { useActiveProfile() {} },
    "@/src/services/popup.service": { hasOpenPopup: () => hasPopup, openPopup: (config: unknown) => { popup = config; } },
    "@/src/utils/useAndroidLeaveGuard": { useAndroidLeaveGuard: (...args: unknown[]) => androidGuards.push(args) },
    "@/src/utils/useAndroidBackAction": { useAndroidBackAction() {} },
    "./chat-top-bar": "ChatTopBar",
    "./chat-session.context": { useChatSession: () => state },
    "@/src/components/inputChat/inputChat": "InputChat",
    "@/src/components/inputChat/ChatKeyboardAvoidingView": "ChatKeyboardAvoidingView",
    "@/src/services/role.service": { Roles: { BUYER: "BUYER" } },
    "@/src/services/toast.service": { clearToastBottomInset() {}, setToastBottomInset() {} },
    "@/src/services/user.role.service": { getCurrentUserRole() {} },
    "@/src/themes": { useTheme: () => ({ colors: {}, spacing: { sm: 8, md: 16 } }) },
    "expo-router": { Slot: "Slot", router: { dismissTo: (route: unknown) => dismissals.push(route) } },
    "react-native": { View: "View", Platform: { OS: platform }, Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
  }, "ChatLayoutContent");
  const render = () => runtime.render(module.ChatLayoutContent);
  return { state, dispatched, dismissals, androidGuards, render,
    get popup() { return popup; }, get prevented() { return prevented; },
    attempt(action: unknown) { onPrevent({ data: { action } }); },
    setDiscardResult(value: boolean) { discardResult = value; },
    setHasPopup(value: boolean) { hasPopup = value; },
  };
}

for (const platform of ["ios", "android"] as const) {
  test(`${platform} saved-draft leave uses the shared popup and dispatches only after confirmed exit`, async () => {
    const layout = createLeaveLayout(platform);
    const tree = layout.render();
    assert.equal(layout.prevented, true);
    assert.deepEqual(layout.androidGuards.at(-1), [false, false]);
    const input = elements(tree).find((element) => element.type === "InputChat")!;
    input.props.onDraftChange(true);
    layout.render();
    const action = { type: "POP", source: "buyer-chat" };
    layout.attempt(action);
    assert.equal(layout.popup.showCloseButton, platform === "android");
    assert.equal(layout.popup.dismissOnBackdropPress, false);
    assert.match(layout.popup.description, /no hayas enviado se perderán/);
    assert.equal(layout.dispatched.length, 0, "Dismissing the popup keeps the draft open");
    await layout.popup.actions[0].onPress();
    layout.render();
    assert.equal(layout.prevented, false);
    assert.deepEqual(layout.dispatched, [action]);
    layout.render();
    assert.equal(layout.dispatched.length, 1);
  });
}

test("leave waits for successful discard, blocks control races, and keeps the no-history home fallback", async () => {
  const layout = createLeaveLayout("android");
  const tree = layout.render();
  elements(tree).find((element) => element.type === "ChatTopBar")!.props.onClose();
  assert.deepEqual(layout.dismissals, ["/(tabs)"]);
  layout.state.isExecutingControl = true;
  layout.render();
  const action = { type: "POP" };
  layout.attempt(action);
  assert.equal(Boolean(layout.popup), false);
  layout.state.isExecutingControl = false;
  layout.state.isSendingMessage = true;
  layout.render();
  layout.attempt(action);
  assert.equal(layout.popup.actions[1].disabled, true);
  layout.state.isSendingMessage = false;
  layout.render();
  layout.attempt(action);
  assert.equal(await layout.popup.actions[1].onPress(), false);
  layout.render();
  assert.equal(layout.prevented, true);
  assert.equal(layout.dispatched.length, 0);
  layout.setDiscardResult(true);
  assert.equal(await layout.popup.actions[1].onPress(), true);
  layout.render();
  assert.deepEqual(layout.dispatched, [action]);
});
