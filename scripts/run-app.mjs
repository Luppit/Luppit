#!/usr/bin/env node

import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";

const MODE_ALIASES = {
  dev: "dev",
  start: "dev",
  tunnel: "dev-tunnel",
  "dev-tunnel": "dev-tunnel",
  reinstall: "reinstall",
  reuse: "reinstall",
  development: "development",
  preview: "preview",
  prod: "production",
  production: "production",
};

const PLATFORM_ALIASES = {
  android: "android",
  ios: "ios",
  iphone: "ios",
  device: "ios",
  simulator: "ios-simulator",
  "ios-simulator": "ios-simulator",
  all: "all",
};

const PROFILE_ENV = {
  development: {
    EXPO_PUBLIC_BUILD_PROFILE: "development",
    SENTRY_DISABLE_AUTO_UPLOAD: "true",
  },
  preview: {
    EXPO_PUBLIC_BUILD_PROFILE: "preview",
    SENTRY_DISABLE_AUTO_UPLOAD: "true",
  },
  production: {
    EXPO_PUBLIC_BUILD_PROFILE: "production",
    SENTRY_ALLOW_FAILURE: "true",
  },
};

const EAS_PLATFORM_OPTIONS = [
  {
    value: "ios",
    label: "iPhone or iPad",
    description: "Install from the EAS internal-distribution link.",
  },
  {
    value: "ios-simulator",
    label: "iOS Simulator",
    description: "Build specifically for the simulator.",
  },
  {
    value: "android",
    label: "Android device or emulator",
    description: "Create an installable Android build.",
  },
];

const EAS_BUILD_HISTORY_URL =
  "https://expo.dev/accounts/luppit/projects/Luppit/builds";

export function createLaunchPlan(modeInput, platformInput) {
  const mode = MODE_ALIASES[modeInput];
  if (!mode) {
    throw new Error(`Unknown mode: ${modeInput}`);
  }

  if (mode === "dev" || mode === "dev-tunnel") {
    if (platformInput) {
      throw new Error("The development server does not need a platform.");
    }

    const useTunnel = mode === "dev-tunnel";
    return {
      mode: useTunnel
        ? "Development server (tunnel)"
        : "Development server (LAN)",
      description: useTunnel
        ? "Reliable app connection through Expo/ngrok. React Native DevTools cannot attach through this tunnel."
        : "Fast local connection with React Native DevTools; the Mac and device must be reachable on the same network.",
      command: "npx",
      args: [
        "expo",
        "start",
        "--dev-client",
        ...(useTunnel ? ["--tunnel"] : ["--lan"]),
        "--clear",
      ],
      env: PROFILE_ENV.development,
      sentry: "Artifact upload is off; this command does not create a native build.",
    };
  }

  if (mode === "reinstall") {
    if (platformInput) {
      throw new Error("Reinstalling an existing build does not need a platform.");
    }

    return {
      mode: "Reuse development build",
      description:
        "Opens EAS build history. Select the latest successful Development build, click Install, and scan its QR code.",
      command: "open",
      args: [EAS_BUILD_HISTORY_URL],
      env: {},
      sentry: "No build is created and no Sentry upload runs.",
    };
  }

  const platform = PLATFORM_ALIASES[platformInput];
  if (!platform) {
    throw new Error(`Choose a platform for the ${mode} build.`);
  }

  if (mode === "production" && platform === "ios-simulator") {
    throw new Error("Production builds cannot target the iOS Simulator.");
  }

  if (platform === "all" && mode !== "production") {
    throw new Error(`The ${mode} build requires one target platform at a time.`);
  }

  const profile = platform === "ios-simulator"
    ? `${mode}-simulator`
    : mode;
  const easPlatform = platform === "ios-simulator" ? "ios" : platform;
  const profileLabel = mode[0].toUpperCase() + mode.slice(1);

  return {
    mode: `${profileLabel} build`,
    description: getBuildDescription(mode),
    command: "npx",
    args: [
      "--yes",
      "eas-cli@latest",
      "build",
      "--profile",
      profile,
      "--platform",
      easPlatform,
    ],
    env: PROFILE_ENV[mode],
    sentry: mode === "production"
      ? "Artifact upload is best-effort and cannot fail the build."
      : "Artifact upload is disabled for this build profile.",
  };
}

function getBuildDescription(mode) {
  switch (mode) {
    case "development":
      return "Install this after native configuration or native dependencies change.";
    case "preview":
      return "Standalone internal build for testing or sharing; Metro is not required.";
    case "production":
      return "Store/TestFlight build for release.";
    default:
      throw new Error(`Unsupported build mode: ${mode}`);
  }
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/^[A-Za-z0-9@._:/=-]+$/.test(part) ? part : JSON.stringify(part)))
    .join(" ");
}

function printUsage() {
  console.log(`
Luppit app launcher

Interactive:
  npm run app

Direct:
  npm run app -- dev
  npm run app -- dev-tunnel
  npm run app -- reinstall
  npm run app -- development <ios|ios-simulator|android>
  npm run app -- preview <ios|ios-simulator|android>
  npm run app -- production <ios|android|all>

Add --dry-run to print the selected command without running it.
`);
}

async function promptChoice(readline, question, options) {
  console.log(`\n${question}`);
  options.forEach((option, index) => {
    console.log(`  ${index + 1}) ${option.label}`);
    console.log(`     ${option.description}`);
  });

  while (true) {
    const answer = (await readline.question("\nChoose a number: ")).trim();
    const option = options[Number(answer) - 1];
    if (option) return option.value;
    console.log("Please choose one of the listed numbers.");
  }
}

async function getInteractiveSelection() {
  const readline = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const mode = await promptChoice(readline, "What do you want to do?", [
      {
        value: "dev-tunnel",
        label: "Start development server — Tunnel (recommended on your network)",
        description: "Reliable connection through Expo/ngrok; React Native DevTools is unavailable.",
      },
      {
        value: "dev",
        label: "Start development server — LAN + debugger",
        description: "Required for React Native DevTools; Mac and phone must connect directly.",
      },
      {
        value: "reinstall",
        label: "Reinstall an existing development build",
        description: "Open the latest EAS builds without creating or spending another build.",
      },
      {
        value: "development",
        label: "Create a development build",
        description: "Use after app.json, native packages, or the Expo SDK changes.",
      },
      {
        value: "preview",
        label: "Create a preview build",
        description: "Standalone internal build for realistic testing or sharing.",
      },
      {
        value: "production",
        label: "Create a production build",
        description: "Store/TestFlight release build.",
      },
    ]);

    if (mode === "dev" || mode === "dev-tunnel" || mode === "reinstall") {
      return { mode };
    }

    const platformOptions = mode === "production"
      ? [
          EAS_PLATFORM_OPTIONS[0],
          EAS_PLATFORM_OPTIONS[2],
          {
            value: "all",
            label: "iOS and Android",
            description: "Queue both production builds.",
          },
        ]
      : EAS_PLATFORM_OPTIONS;
    const platform = await promptChoice(
      readline,
      "Where should this build run?",
      platformOptions,
    );

    return { mode, platform };
  } finally {
    readline.close();
  }
}

async function run() {
  const rawArgs = process.argv.slice(2);
  const dryRun = rawArgs.includes("--dry-run");
  const args = rawArgs.filter((arg) => arg !== "--dry-run");

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  let selection;
  if (args.length > 0) {
    selection = { mode: args[0], platform: args[1] };
  } else if (process.stdin.isTTY) {
    selection = await getInteractiveSelection();
  } else {
    printUsage();
    process.exitCode = 1;
    return;
  }

  let plan;
  try {
    plan = createLaunchPlan(selection.mode, selection.platform);
  } catch (error) {
    console.error(`\n${error.message}`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  console.log(`\nSelected: ${plan.mode}`);
  console.log(plan.description);
  console.log(`Sentry: ${plan.sentry}`);
  console.log(`Command: ${formatCommand(plan.command, plan.args)}\n`);

  if (dryRun) return;

  const child = spawn(plan.command, plan.args, {
    stdio: "inherit",
    env: { ...process.env, ...plan.env },
  });

  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        process.exitCode = 1;
        console.error(`Launcher stopped by signal ${signal}.`);
      } else {
        process.exitCode = code ?? 1;
      }
      resolve();
    });
  });
}

const isEntryPoint = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isEntryPoint) {
  await run();
}
