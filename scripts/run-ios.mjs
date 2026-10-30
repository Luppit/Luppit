#!/usr/bin/env node

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve("expo/package.json"));
const execFileAsync = promisify(execFile);

export async function enableDeviceHubAsync({
  platform = process.platform,
  execute = async (command, args) => {
    const { stdout } = await execFileAsync(command, args);
    return { stdout };
  },
  fileExists = (path) => existsSync(path),
} = {}) {
  if (platform !== "darwin") return false;
  if (!expoRequire("@expo/cli/package.json").version.startsWith("54.")) return false;

  const { stdout } = await execute("xcode-select", ["--print-path"]);
  const deviceHubPath = resolve(stdout.trim(), "..", "Applications", "DeviceHub.app");
  if (!fileExists(deviceHubPath)) return false;

  const { SimulatorAppPrerequisite } = expoRequire(
    "@expo/cli/build/src/start/doctor/apple/SimulatorAppPrerequisite.js",
  );
  const { AppleDeviceManager } = expoRequire(
    "@expo/cli/build/src/start/platforms/ios/AppleDeviceManager.js",
  );

  // SDK 54 only recognizes Simulator.app. Keep the bridge local to this CLI process.
  SimulatorAppPrerequisite.instance.assertImplementation = async () => {
    await execute("xcrun", ["simctl", "help"]);
  };
  SimulatorAppPrerequisite.instance.resetAssertion();

  AppleDeviceManager.prototype.activateWindowAsync = async function () {
    await execute("open", [
      "-a",
      deviceHubPath,
      `devices://device/open?id=${encodeURIComponent(this.device.udid)}`,
    ]);
  };

  return true;
}

const isEntryPoint = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntryPoint) {
  if (await enableDeviceHubAsync()) {
    console.log("Using Xcode Device Hub for the iOS simulator.");
  }
  process.argv.splice(2, 0, "run:ios");
  expoRequire("@expo/cli");
}
