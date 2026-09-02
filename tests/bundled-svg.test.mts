import assert from "node:assert/strict";
import test from "node:test";
import { getBundledSvgUri } from "../src/components/bundledSvgUri.ts";

test("does not expose an Android resource identifier to SvgUri", () => {
  assert.equal(
    getBundledSvgUri("android", {
      uri: "assets_images_logoicon",
      localUri: null,
    }),
    null
  );
});

test("uses the downloaded Android file URI", () => {
  assert.equal(
    getBundledSvgUri("android", {
      uri: "assets_images_logoicon",
      localUri: "file:///cache/ExponentAsset-logo.svg",
    }),
    "file:///cache/ExponentAsset-logo.svg"
  );
});

test("preserves existing non-Android asset resolution", () => {
  assert.equal(
    getBundledSvgUri("ios", {
      uri: "http://localhost:8081/assets/logo-icon.svg",
      localUri: null,
    }),
    "http://localhost:8081/assets/logo-icon.svg"
  );
});
