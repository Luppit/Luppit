import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { enableDeviceHubAsync } from "../scripts/run-ios.mjs";

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve("expo/package.json"));
const { SimulatorAppPrerequisite } = expoRequire(
  "@expo/cli/build/src/start/doctor/apple/SimulatorAppPrerequisite.js",
);
const { AppleDeviceManager } = expoRequire(
  "@expo/cli/build/src/start/platforms/ios/AppleDeviceManager.js",
);

test("non-macOS launch keeps Expo's platform validation", async () => {
  assert.equal(await enableDeviceHubAsync({
    platform: "linux",
    execute: async () => { throw new Error("Must not run Xcode tools"); },
  }), false);
});

test("Xcode without Device Hub keeps the original Simulator implementation", async () => {
  const originalAssertion = SimulatorAppPrerequisite.instance.assertImplementation;
  const originalActivation = AppleDeviceManager.prototype.activateWindowAsync;

  assert.equal(await enableDeviceHubAsync({
    platform: "darwin",
    execute: async () => ({ stdout: "/Applications/Xcode.app/Contents/Developer\n" }),
    fileExists: () => false,
  }), false);
  assert.equal(SimulatorAppPrerequisite.instance.assertImplementation, originalAssertion);
  assert.equal(AppleDeviceManager.prototype.activateWindowAsync, originalActivation);
});

test("Device Hub validates simctl and opens the selected simulator in the active Xcode", async (t) => {
  const originalAssertion = SimulatorAppPrerequisite.instance.assertImplementation;
  const originalActivation = AppleDeviceManager.prototype.activateWindowAsync;
  t.after(() => {
    SimulatorAppPrerequisite.instance.assertImplementation = originalAssertion;
    SimulatorAppPrerequisite.instance.resetAssertion();
    AppleDeviceManager.prototype.activateWindowAsync = originalActivation;
  });

  const calls: { command: string; args: readonly string[] }[] = [];
  const deviceHubPath = "/Applications/Xcode Custom.app/Contents/Applications/DeviceHub.app";
  let simctlAvailable = true;
  assert.equal(await enableDeviceHubAsync({
    platform: "darwin",
    execute: async (command: string, args: readonly string[]) => {
      calls.push({ command, args });
      if (command === "xcrun" && !simctlAvailable) throw new Error("simctl unavailable");
      return { stdout: "/Applications/Xcode Custom.app/Contents/Developer\n" };
    },
    fileExists: (path: string) => path === deviceHubPath,
  }), true);

  await SimulatorAppPrerequisite.instance.assertAsync();
  const manager = new AppleDeviceManager({ udid: "selected-device" });
  await manager.activateWindowAsync();
  assert.deepEqual(calls, [
    { command: "xcode-select", args: ["--print-path"] },
    { command: "xcrun", args: ["simctl", "help"] },
    {
      command: "open",
      args: ["-a", deviceHubPath, "devices://device/open?id=selected-device"],
    },
  ]);

  simctlAvailable = false;
  SimulatorAppPrerequisite.instance.resetAssertion();
  await assert.rejects(SimulatorAppPrerequisite.instance.assertAsync(), /simctl unavailable/);
});
