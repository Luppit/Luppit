import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { prepareConversationImageForUpload, preparePurchaseRequestImage } from "../src/services/purchase.request.image.service";

function createPreparation() {
  const sizes = new Map<string, number>();
  const attempts: { uri: string; width: number; height: number; format: string }[] = [];
  let fail = false;
  let outputSizes = [3 * 1024 * 1024, 1024 * 1024];
  class File {
    readonly uri: string;
    constructor(uri: string) { this.uri = uri; }
    get size() { return sizes.get(this.uri) ?? 0; }
  }
  const manipulator = {
    SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
    manipulateAsync: async (uri: string, actions: { resize: { width: number; height: number } }[], options: { format: string }) => {
      if (fail) throw new Error("Native image error");
      const index = attempts.length;
      attempts.push({ uri, ...actions[0].resize, format: options.format });
      const outputUri = `file:///prepared-${index}.${options.format}`;
      sizes.set(outputUri, outputSizes[index] ?? outputSizes.at(-1)!);
      return { uri: outputUri, ...actions[0].resize };
    },
  };
  const source = readFileSync(new URL("../src/services/purchase.request.image.service.ts", import.meta.url), "utf8");
  const exports = {} as { preparePurchaseRequestImage: typeof preparePurchaseRequestImage; prepareConversationImageForUpload: typeof prepareConversationImageForUpload };
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require(name: string) {
      if (name === "expo-file-system") return { File };
      if (name === "expo-image-manipulator") return manipulator;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    prepare: exports.preparePurchaseRequestImage,
    prepareConversation: exports.prepareConversationImageForUpload,
    sizes,
    attempts,
    set outputSizes(value: number[]) { outputSizes = value; },
    set fail(value: boolean) { fail = value; },
  };
}

test("small images retain their original URI and size", async () => {
  const prep = createPreparation();
  prep.sizes.set("file:///photo.jpg", 1024);
  const image = { uri: "file:///photo.jpg", mime: "image/jpeg", width: 4000, height: 3000 };
  assert.equal(JSON.stringify(await prep.prepare(image)), JSON.stringify({ ...image, size: 1024 }));
  assert.equal(prep.attempts.length, 0);
});

test("large phone photos are resized until the actual file fits the server limit", async () => {
  const prep = createPreparation();
  const image = { uri: "file:///photo.jpg", mime: "image/jpeg", width: 4000, height: 3000, size: 6 * 1024 * 1024 };
  const result = await prep.prepare(image);
  assert.equal(result.uri, "file:///prepared-1.jpeg");
  assert.equal(result.mime, "image/jpeg");
  assert.equal(result.size, 1024 * 1024);
  assert.equal(result.name, "request-image.jpg");
  assert.deepEqual(prep.attempts.map(({ width, height }) => [width, height]), [[1600, 1200], [1200, 900]]);
});

test("large PNGs keep their format and GIFs are never flattened", async () => {
  const prep = createPreparation();
  prep.outputSizes = [1024 * 1024];
  const result = await prep.prepare({ uri: "file:///screen.png", mime: "image/png", width: 2400, height: 1200, size: 3 * 1024 * 1024 });
  assert.equal(result.mime, "image/png");
  assert.equal(result.name, "request-image.png");
  assert.equal(prep.attempts[0].format, "png");
  await assert.rejects(prep.prepare({ uri: "file:///animated.gif", mime: "image/gif", size: 3 * 1024 * 1024 }), /GIF supera 2 MB/);
  assert.equal(prep.attempts.length, 1);
});

test("failed or insufficient compression rejects instead of dropping or mislabeling an attachment", async () => {
  const prep = createPreparation();
  const image = { uri: "file:///photo.jpg", mime: "image/jpeg", width: 4000, height: 3000, size: 6 * 1024 * 1024 };
  prep.fail = true;
  await assert.rejects(prep.prepare(image), /No se pudo preparar/);
  prep.fail = false;
  prep.outputSizes = [3 * 1024 * 1024];
  await assert.rejects(prep.prepare(image), /No se pudo reducir/);
  assert.equal(prep.attempts.length, 4);
});

test("conversation photos keep the 4 MB contract and resize oversized camera images", async () => {
  const prep = createPreparation();
  const image = { uri: "file:///photo.jpg", mime: "image/jpeg", width: 4000, height: 3000, size: 3_000_000 };
  assert.equal((await prep.prepareConversation(image)).uri, image.uri);
  assert.equal(prep.attempts.length, 0);

  prep.outputSizes = [3_500_000];
  const prepared = await prep.prepareConversation({ ...image, size: 6_000_000 });
  assert.equal(prepared.uri, "file:///prepared-0.jpeg");
  assert.equal(prepared.size, 3_500_000);
  assert.equal(prepared.name, "conversation-image.jpg");
});
