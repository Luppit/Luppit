import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { callPurchaseRequestAssistant } from "../src/services/purchase.request.assistant.service";

// Exercise the service's actual request construction; native multipart encoding is device QA.
function createService() {
  const calls: { url: string; options: RequestInit }[] = [];
  let profile: { id: string } | null = { id: "owned-profile" };
  let registered: AbortController | undefined;
  let unregistered = 0;
  let status = 200;
  let payload: Record<string, unknown> | null = null;
  let switchAfterSession = false;
  let switchAfterResponse = false;
  class NativeFormData {
    entries: [string, unknown][] = [];
    append(name: string, value: unknown) { this.entries.push([name, value]); }
  }
  const modules = {
    "../lib/supabase": { getSession: async () => { if (switchAfterSession) profile = { id: "other-profile" }; return { access_token: "test-token" }; } },
    "../lib/supabase/errors": { fromAppError: (type: string) => ({ type, message: "Test failure" }) },
    "./active.profile.service": {
      getCurrentProfile: () => profile,
      registerProfileScopedAbortController: (controller: AbortController) => {
        registered = controller;
        return () => { unregistered++; };
      },
    },
  };
  const source = readFileSync(new URL("../src/services/purchase.request.assistant.service.ts", import.meta.url), "utf8");
  const exports = {} as { callPurchaseRequestAssistant: typeof callPurchaseRequestAssistant };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports, AbortController, FormData: NativeFormData,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: "https://test.invalid", EXPO_PUBLIC_SUPABASE_ANON_KEY: "test-key" } },
    require(name: keyof typeof modules) { assert.ok(name in modules); return modules[name]; },
    fetch: async (url: string, options: RequestInit) => {
      calls.push({ url, options });
      if (options.signal?.aborted) throw new Error("aborted");
      if (switchAfterResponse) profile = { id: "other-profile" };
      return new Response(JSON.stringify(payload ?? (status === 200
        ? { ok: true, draft_id: "draft-1", status: "draft" }
        : { ok: false, error: "No se pudo subir la imagen." })), { status });
    },
  });
  return {
    call: exports.callPurchaseRequestAssistant, calls,
    get controller() { return registered; },
    get unregistered() { return unregistered; },
    setStatus(value: number) { status = value; },
    clearProfile() { profile = null; },
    setPayload(value: Record<string, unknown>, code = 200) { payload = value; status = code; },
    switchDuring(stage: "session" | "response") { switchAfterSession = stage === "session"; switchAfterResponse = stage === "response"; },
    form() { return Object.fromEntries((calls.at(-1)!.options.body as unknown as NativeFormData).entries); },
    images() { return (calls.at(-1)!.options.body as unknown as NativeFormData).entries.filter(([key]) => key === "images").map(([, value]) => value as { uri: string; type: string; name: string }); },
  };
}

const identity = { client_request_id: "same-turn", idempotency_key: "same-retry", draft_id: "draft-1" };

test("text-only messages retain JSON and the current owned profile", async () => {
  const service = createService();
  const result = await service.call({ prompt: "  Llantas  ", ...identity });
  assert.equal(result.ok, true);
  const options = service.calls[0].options;
  assert.equal((options.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(options.body as string), { prompt: "Llantas", ...identity, ui_action: null, active_profile_id: "owned-profile" });
  assert.equal(service.unregistered, 1);
});

for (const prompt of ["", "Quiero este modelo"]) {
  test(`multipart carries ${prompt ? "text plus" : "only"} images, profile and retry identity`, async () => {
    const service = createService();
    const images = [
      { uri: "file:///a.jpg", mime: " IMAGE/JPG ", size: 2 * 1024 * 1024 },
      { uri: "file:///b.PNG", size: 1024 },
      { uri: "file:///c.webp", mime: "image/webp; charset=binary" },
    ];
    assert.equal((await service.call({ prompt, images, ...identity })).ok, true);
    const form = service.form();
    assert.equal(form.prompt, prompt);
    assert.equal(form.draft_id, identity.draft_id);
    assert.equal(form.client_request_id, identity.client_request_id);
    assert.equal(form.idempotency_key, identity.idempotency_key);
    assert.equal(form.active_profile_id, "owned-profile");
    assert.deepEqual(service.images().map((image) => image.type), ["image/jpeg", "image/png", "image/webp"]);
    assert.deepEqual(service.images().map((image) => image.uri), images.map((image) => image.uri));
    const headers = service.calls[0].options.headers as Record<string, string>;
    assert.equal(headers["Content-Type"], undefined, "Native fetch must supply the multipart boundary");
    assert.equal(headers["Idempotency-Key"], identity.idempotency_key);
    assert.equal(service.controller?.signal, service.calls[0].options.signal);
  });
}

test("unsupported, oversized, empty and excess images are rejected before transport", async () => {
  const valid = { uri: "file:///a.jpg", mime: "image/jpeg", size: 1024 };
  for (const images of [
    [{ ...valid, size: 2 * 1024 * 1024 + 1 }],
    [{ ...valid, size: 0 }],
    [{ ...valid, uri: "" }],
    [{ ...valid, mime: "image/heic" }],
    [{ uri: "file:///unknown" }],
    [valid, valid, valid, valid],
  ]) {
    const service = createService();
    const result = await service.call({ prompt: "", images });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.statusCode, 400);
    assert.equal(service.calls.length, 0);
  }
});

test("upload errors remain failures and retries resend the same native image payload", async () => {
  const service = createService();
  const input = { prompt: "", images: [{ uri: "file:///a.gif", mime: "image/gif" }], ...identity };
  service.setStatus(500);
  const result = await service.call(input);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.message, "No se pudo subir la imagen.");
  const form = service.form();
  service.setStatus(200);
  assert.equal((await service.call(input)).ok, true);
  assert.deepEqual(service.form(), form);
});

test("image uploads honor caller cancellation and cannot start without an active profile", async () => {
  const service = createService();
  const controller = new AbortController();
  controller.abort();
  const input = { prompt: "", images: [{ uri: "file:///a.jpg" }], signal: controller.signal };
  const result = await service.call(input);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "PROFILE_SCOPED_REQUEST_ABORTED");
  assert.equal(service.controller?.signal.aborted, true);
  assert.equal(service.unregistered, 1);
  service.clearProfile();
  const blocked = await service.call({ ...input, signal: undefined });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.statusCode, 401);
  assert.equal(service.calls.length, 1);
});


test("RESTORE normalizes stable transcript IDs, control markers and persisted signed images", async () => {
  const service = createService();
  service.setPayload({ ok: true, draft_id: "saved", status: "ready", ui_state: "review", pending_action: null,
    signed_images: [{ storage_ref: "storage://chat-product-images/owned-profile/a.jpg", signed_url: "https://example.test/fresh" }],
    messages: [
      { id: "one", role: "user", content: "[imagenes:2]", metadata: { image_count: 2, image_refs: ["storage://chat-product-images/owned-profile/a.jpg"] } },
      { id: "two", role: "user", content: "[ui_action:SHOW_SUMMARY]", metadata: { ui_action: "SHOW_SUMMARY" } },
      { id: "three", role: "assistant", content: "Datos guardados", metadata: {} },
      { id: "four", role: "system", content: "Internal context" },
      { id: "five", role: "user", content: "[imagenes:1]", metadata: { image_count: 1, image_refs: [] } },
      { id: "six", role: "user", content: "Literal [imagenes:1]", metadata: {} },
    ],
  });
  const result = await service.call({ prompt: "", ui_action: "RESTORE" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.draftId, "saved");
  assert.equal(result.messages.length, 5);
  assert.equal(result.messages[0].id, "one");
  assert.equal(result.messages[0].content, "");
  assert.equal(result.messages[0].imageUrls[0], "https://example.test/fresh");
  assert.equal(result.messages[1].content, "Ver resumen");
  assert.equal(result.messages[3].content, "Imagen adjunta no disponible.");
  assert.equal(result.messages[4].content, "Literal [imagenes:1]");
});

test("RESTORE refuses malformed/old-server responses and retains terminal conflict codes", async () => {
  for (const payload of [{ ok: true }, { ok: true, draft_id: null, status: "ready", messages: [] }, { ok: true, draft_id: "published", status: "published", messages: [] }]) {
    const service = createService(); service.setPayload(payload);
    assert.equal((await service.call({ prompt: "", ui_action: "RESTORE" })).ok, false);
  }
  const service = createService();
  service.setPayload({ ok: false, error: "ui_action inválido." }, 400);
  const oldServer = await service.call({ prompt: "", ui_action: "RESTORE" });
  assert.equal(oldServer.ok, false);
  if (!oldServer.ok) assert.equal(oldServer.error.message, "No se pudo cargar tu solicitud. Reintenta en un momento.");
  service.setPayload({ ok: false, error: "Borrador no disponible", code: "REQUEST_DRAFT_UNAVAILABLE" }, 409);
  const unavailable = await service.call({ prompt: "", draft_id: "saved", ui_action: "DISCARD" });
  assert.equal(unavailable.ok, false);
  if (!unavailable.ok) assert.equal(unavailable.error.code, "REQUEST_DRAFT_UNAVAILABLE");
});

for (const stage of ["session", "response"] as const) {
  test(`profile changes during ${stage} cannot return another session's draft state`, async () => {
    const service = createService(); service.switchDuring(stage);
    service.setPayload({ ok: true, draft_id: "old-profile-draft", status: "ready", messages: [] });
    const result = await service.call({ prompt: "", ui_action: "RESTORE" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "PROFILE_SCOPED_REQUEST_ABORTED");
    assert.equal(service.controller?.signal.aborted, true);
  });
}

test("RESTORE hides only metadata-backed assistant control records and preserves JSON prose", async () => {
  const service = createService();
  const metadata = { status: "draft", tipo_interaccion: "CONTROL", accion_control: "MOSTRAR_RESUMEN" };
  const content = JSON.stringify(metadata);
  service.setPayload({ ok: true, draft_id: "saved", status: "draft", messages: [
    { id: "internal", role: "assistant", content, metadata },
    { id: "literal", role: "assistant", content, metadata: {} },
    { id: "prose", role: "assistant", content: "Todavía falta la categoría.", metadata },
    { id: "different", role: "assistant", content: JSON.stringify({ ...metadata, detail: "User-visible content" }), metadata },
  ] });
  const result = await service.call({ prompt: "", ui_action: "RESTORE" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(Array.from(result.messages, (message) => message.id), ["literal", "prose", "different"]);
});

test("only unsupported RESTORE errors expose a recoverable owned draft ID", async () => {
  const service = createService();
  service.setPayload({ ok: false, code: "REQUEST_DRAFT_UNSUPPORTED", error: "Usa Descartar al salir", draft_id: "saved" }, 409);
  const result = await service.call({ prompt: "", ui_action: "RESTORE" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.recoverableDraftId, "saved");
  service.setPayload({ ok: false, code: "REQUEST_DRAFT_UNAVAILABLE", error: "No disponible", draft_id: "foreign" }, 409);
  const unavailable = await service.call({ prompt: "", ui_action: "RESTORE" });
  if (!unavailable.ok) assert.equal(unavailable.recoverableDraftId, null);
});
