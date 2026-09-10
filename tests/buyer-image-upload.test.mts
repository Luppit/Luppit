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
  class NativeFormData {
    entries: [string, unknown][] = [];
    append(name: string, value: unknown) { this.entries.push([name, value]); }
  }
  const modules = {
    "../lib/supabase": { getSession: async () => ({ access_token: "test-token" }) },
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
      return new Response(JSON.stringify(status === 200
        ? { ok: true, draft_id: "draft-1", status: "draft" }
        : { ok: false, error: "No se pudo subir la imagen." }), { status });
    },
  });
  return {
    call: exports.callPurchaseRequestAssistant, calls,
    get controller() { return registered; },
    get unregistered() { return unregistered; },
    setStatus(value: number) { status = value; },
    clearProfile() { profile = null; },
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
