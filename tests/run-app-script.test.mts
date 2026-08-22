import assert from "node:assert/strict";
import test from "node:test";
import { createLaunchPlan } from "../scripts/run-app.mjs";

test("LAN development server targets the installed dev client and skips Sentry upload", () => {
  const plan = createLaunchPlan("dev");

  assert.deepEqual(plan.args, [
    "expo",
    "start",
    "--dev-client",
    "--lan",
    "--clear",
  ]);
  assert.equal(plan.env.EXPO_PUBLIC_BUILD_PROFILE, "development");
  assert.equal(plan.env.SENTRY_DISABLE_AUTO_UPLOAD, "true");
});

test("tunnel development server explicitly uses Expo tunnel mode", () => {
  const plan = createLaunchPlan("dev-tunnel");

  assert.deepEqual(plan.args, [
    "expo",
    "start",
    "--dev-client",
    "--tunnel",
    "--clear",
  ]);
  assert.equal(plan.env.EXPO_PUBLIC_BUILD_PROFILE, "development");
  assert.match(plan.description, /DevTools cannot attach/);
});

test("reinstall opens existing EAS builds without creating a build", () => {
  const plan = createLaunchPlan("reinstall");

  assert.equal(plan.command, "open");
  assert.match(plan.args[0], /expo\.dev.*\/builds$/);
  assert.match(plan.sentry, /No build is created/);
});

test("development simulator uses the matching EAS profile", () => {
  const plan = createLaunchPlan("development", "ios-simulator");

  assert.ok(plan.args.includes("development-simulator"));
  assert.equal(plan.args.at(-1), "ios");
  assert.equal(plan.env.SENTRY_DISABLE_AUTO_UPLOAD, "true");
});

test("preview build disables Sentry artifact upload", () => {
  const plan = createLaunchPlan("preview", "android");

  assert.ok(plan.args.includes("preview"));
  assert.equal(plan.args.at(-1), "android");
  assert.equal(plan.env.EXPO_PUBLIC_BUILD_PROFILE, "preview");
  assert.equal(plan.env.SENTRY_DISABLE_AUTO_UPLOAD, "true");
});

test("production build keeps Sentry best-effort", () => {
  const plan = createLaunchPlan("production", "all");

  assert.ok(plan.args.includes("production"));
  assert.equal(plan.args.at(-1), "all");
  assert.equal(plan.env.SENTRY_ALLOW_FAILURE, "true");
  assert.equal(plan.env.SENTRY_DISABLE_AUTO_UPLOAD, undefined);
});

test("production build rejects the iOS simulator", () => {
  assert.throws(
    () => createLaunchPlan("production", "ios-simulator"),
    /cannot target the iOS Simulator/,
  );
});
