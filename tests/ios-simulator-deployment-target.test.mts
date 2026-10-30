import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const withIosSimulatorDeploymentTarget = require("../plugins/withIosSimulatorDeploymentTarget.js");
const simulatorKey = "IPHONEOS_DEPLOYMENT_TARGET[sdk=iphonesimulator*]";
const deviceKey = "IPHONEOS_DEPLOYMENT_TARGET";
const podfile = `post_install do |installer|
  react_native_post_install(installer)
end
`;

async function applyPlugin(contents: string) {
  const config = withIosSimulatorDeploymentTarget({ name: "Test", slug: "test" });
  const result = await config.mods.ios.podfile({
    ...config,
    modResults: { contents, language: "ruby" },
    modRequest: {},
  });
  return result.modResults.contents as string;
}

async function evaluateTargets(
  settings: Record<string, string>[],
  properties: Record<string, string> = {},
) {
  const contents = await applyPlugin(podfile);
  const ruby = `require 'json'
require 'ostruct'
input = JSON.parse(STDIN.read)
podfile_properties = input['properties']
installer = OpenStruct.new(pods_project: OpenStruct.new(targets: [
  OpenStruct.new(build_configurations: input['settings'].map { |settings| OpenStruct.new(build_settings: settings) })
]))
define_singleton_method(:post_install) { |&block| block.call(installer) }
define_singleton_method(:react_native_post_install) { |_installer| }
${contents}
puts JSON.generate(installer.pods_project.targets.first.build_configurations.map(&:build_settings))
`;
  return JSON.parse(execFileSync("ruby", ["-e", ruby], {
    input: JSON.stringify({ settings, properties }),
    encoding: "utf8",
  })) as Record<string, string>[];
}

test("raises outdated simulator targets while preserving physical-device values", async () => {
  const settings = ["9.0", "11.0", "12.4", "13.4"].map((value) => ({ [deviceKey]: value }));
  assert.deepEqual(await evaluateTargets(settings), settings.map((value) => ({
    ...value,
    [simulatorKey]: "15.1",
  })));
});

test("preserves supported, higher, inherited, and missing deployment targets", async () => {
  const settings: Record<string, string>[] = [
    { [deviceKey]: "15.1" },
    { [deviceKey]: "17.0" },
    { [deviceKey]: "9.0", [simulatorKey]: "16.0" },
    { [deviceKey]: "$(inherited)" },
    {},
  ];
  assert.deepEqual(await evaluateTargets(settings), settings);
});

test("uses the configured app minimum and corrects an existing lower simulator override", async () => {
  assert.deepEqual(await evaluateTargets([
    { [deviceKey]: "9.0", [simulatorKey]: "14.0" },
    { [deviceKey]: "17.0" },
  ], { "ios.deploymentTarget": "16.0" }), [
    { [deviceKey]: "9.0", [simulatorKey]: "16.0" },
    { [deviceKey]: "17.0" },
  ]);
});

test("repeated prebuilds keep one generated hook and preserve the existing post-install call", async () => {
  const first = await applyPlugin(podfile);
  const second = await applyPlugin(first);
  assert.equal(second, first);
  assert.equal((second.match(/@generated begin luppit-ios-simulator-deployment-target/g) ?? []).length, 1);
  assert.ok(second.includes("react_native_post_install(installer)"));
});

test("fails clearly when the Podfile has no supported post-install hook", async () => {
  await assert.rejects(applyPlugin("platform :ios, '15.1'\n"), /Failed to match/);
});
