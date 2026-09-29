import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { createConversationMessages } from "../src/services/conversation.message.service";

function fixture(options: { preparationError?: string; sendError?: boolean } = {}) {
  const uploads: { path: string; bytes: number; contentType: string }[] = [];
  const invocations: Record<string, any>[] = [];
  const removed: string[][] = [];
  const storage = {
    upload: async (path: string, body: ArrayBuffer, settings: { contentType: string }) => {
      uploads.push({ path, bytes: body.byteLength, contentType: settings.contentType });
      return { error: null };
    },
    remove: async (paths: string[]) => { removed.push(paths); return { error: null }; },
    createSignedUrl: async () => { throw new Error("Signing must not delay a committed send"); },
  };
  const supabase = {
    storage: { from: () => storage },
    functions: { invoke: async (_name: string, request: { body: Record<string, any> }) => {
      invocations.push(request.body);
      if (options.sendError) return { error: { message: "Server unavailable" }, data: null };
      const messages = [
        ...(request.body.text ? [{ id: "text", message_kind: "TEXT", text: request.body.text }] : []),
        ...request.body.pendingImagePaths.map((image_path: string, index: number) => ({
          id: `image-${index}`, message_kind: "IMAGE", image_path,
        })),
      ];
      return { error: null, data: { messages } };
    } },
  };
  const source = readFileSync(new URL("../src/services/conversation.message.service.ts", import.meta.url), "utf8");
  const exports = {} as { createConversationMessages: typeof createConversationMessages };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    fetch: async () => ({ arrayBuffer: async () => new ArrayBuffer(3_500_000) }),
    require(name: string) {
      const modules: Record<string, unknown> = {
        "../db/functions": { RPC_FUNCTIONS: {} },
        "../db/types": {},
        "../lib/supabase": { getSession: async () => ({ user: { id: "user" } }) },
        "../lib/supabase/client": { supabase },
        "../lib/supabase/errors": {
          fromAppError: (type: string) => ({ type, message: type }),
          fromSupabaseError: (error: { message: string }) => ({ type: "network", message: error.message }),
        },
        "../lib/supabase/storage": { STORAGE_BUCKETS: { conversations: "conversations" } },
        "./active.profile.service": { getCurrentProfileResult: async () => ({ ok: true, data: { id: "profile" } }) },
        "./purchase.request.image.service": { prepareConversationImageForUpload: async (image: any) => {
          if (options.preparationError) throw new Error(options.preparationError);
          return { ...image, uri: "file:///prepared.jpg", mime: "image/jpeg", size: 3_500_000, name: "conversation-image.jpg" };
        } },
      };
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    },
  });
  return { send: exports.createConversationMessages, uploads, invocations, removed };
}

const image = { uri: "file:///camera.jpg", mime: "image/jpeg", size: 6_000_000, name: "camera.jpg" };

test("text and photo are uploaded and sent as one group before success is reported", async () => {
  const f = fixture();
  const result = await f.send({ conversationId: "conversation", text: "Llantas", images: [image], messageGroupId: "group" });
  assert.equal(result.ok, true);
  assert.equal(f.uploads.length, 1);
  assert.equal(f.uploads[0].bytes, 3_500_000);
  assert.equal(f.uploads[0].contentType, "image/jpeg");
  assert.equal(f.invocations.length, 1);
  assert.equal(f.invocations[0].text, "Llantas");
  assert.equal(f.invocations[0].messageGroupId, "group");
  assert.equal(f.invocations[0].pendingImagePaths[0], f.uploads[0].path);
  if (result.ok) assert.equal(result.data.length, 2);
});

test("image-only send has no text row and preparation failure sends nothing", async () => {
  const f = fixture();
  const result = await f.send({ conversationId: "conversation", images: [image] });
  assert.equal(result.ok, true);
  assert.equal(f.invocations[0].text, null);
  if (result.ok) assert.equal(result.data.length, 1);

  const failed = fixture({ preparationError: "No se pudo reducir la imagen a 4 MB." });
  const failure = await failed.send({ conversationId: "conversation", text: "Llantas", images: [image] });
  assert.equal(failure.ok, false);
  assert.equal(failed.uploads.length, 0);
  assert.equal(failed.invocations.length, 0);
});

test("failed group send removes uploaded photo and reports failure", async () => {
  const f = fixture({ sendError: true });
  const result = await f.send({ conversationId: "conversation", text: "Llantas", images: [image] });
  assert.equal(result.ok, false);
  assert.equal(f.removed.length, 1);
  assert.equal(f.removed[0][0], f.uploads[0].path);
});
