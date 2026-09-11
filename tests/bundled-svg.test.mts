import assert from "node:assert/strict";
import test from "node:test";
import {
  getAndroidBundledSvgDownloadDescriptor,
  getBundledSvgUri,
} from "../src/components/bundledSvgUri.ts";

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

test("rejects the resource identifier exposed as localUri in Android release builds", () => {
  assert.equal(
    getBundledSvgUri("android", {
      uri: "assets_images_logoicon",
      localUri: "assets_images_logoicon",
    }),
    null
  );
});

test("rejects Android embedded resource paths that SvgUri cannot fetch", () => {
  assert.equal(
    getBundledSvgUri("android", {
      uri: "file:///android_res/raw/assets_images_logoicon.svg",
      localUri: "file:///android_res/raw/assets_images_logoicon.svg",
    }),
    null
  );
});

test("creates a fresh Android download descriptor that bypasses stale downloaded state", () => {
  assert.deepEqual(
    getAndroidBundledSvgDownloadDescriptor({
      name: "logo-icon",
      type: "svg",
      uri: "assets_images_logoicon",
      localUri: "assets_images_logoicon",
    }),
    {
      name: "logo-icon",
      type: "svg",
      uri: "assets_images_logoicon",
      hash: null,
    }
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
