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

test("simulator builds and opens the local iOS app without EAS or Sentry upload", () => {
  const plan = createLaunchPlan("simulator");

  assert.equal(plan.command, "npx");
  assert.deepEqual(plan.args, ["expo", "run:ios"]);
  assert.equal(plan.env.EXPO_PUBLIC_BUILD_PROFILE, "development");
  assert.equal(plan.env.SENTRY_DISABLE_AUTO_UPLOAD, "true");
  assert.match(plan.sentry, /no EAS build/i);
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
  assert.equal(plan.args.some((arg) => arg.includes("auto-submit")), false);
  assert.equal(plan.env.SENTRY_ALLOW_FAILURE, "true");
  assert.equal(plan.env.SENTRY_DISABLE_AUTO_UPLOAD, undefined);
});

test("iOS release creates a production build and submits it to TestFlight", () => {
  const plan = createLaunchPlan("release", "ios");

  assert.deepEqual(plan.args.slice(-5), [
    "--profile",
    "production",
    "--platform",
    "ios",
    "--auto-submit-with-profile=production",
  ]);
  assert.match(plan.description, /\.ipa.*TestFlight/i);
  assert.equal(plan.env.EXPO_PUBLIC_BUILD_PROFILE, "production");
  assert.equal(plan.env.SENTRY_ALLOW_FAILURE, "true");
});

test("Android submit alias creates a production build and submits it to internal testing", () => {
  const plan = createLaunchPlan("submit", "android");

  assert.deepEqual(plan.args.slice(-5), [
    "--profile",
    "production",
    "--platform",
    "android",
    "--auto-submit-with-profile=production",
  ]);
  assert.match(plan.description, /\.aab.*Google Play internal testing/i);
  assert.equal(plan.env.EXPO_PUBLIC_BUILD_PROFILE, "production");
});

test("production build rejects the iOS simulator", () => {
  assert.throws(
    () => createLaunchPlan("production", "ios-simulator"),
    /cannot target the iOS Simulator/,
  );
});

test("release build rejects the iOS simulator", () => {
  assert.throws(
    () => createLaunchPlan("release", "ios-simulator"),
    /cannot target the iOS Simulator/,
  );
});
