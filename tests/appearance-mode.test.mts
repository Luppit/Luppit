import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function load(path: string, modules: Record<string, any>) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const exports: any = {};
  runInNewContext(outputText, { exports, require(name: string) {
    assert.ok(name in modules, `Unmocked import: ${name}`);
    return modules[name];
  } });
  return exports;
}

function fixture(saved = new Map<string, string>(), initialScheme = "light", nativeOverride = true) {
  let cursor = 0;
  let systemScheme = initialScheme;
  let read: () => Promise<string | null> = async () => saved.get("appearance_mode") ?? null;
  let write = async (key: string, value: string) => { saved.set(key, value); };
  const values: any[] = [];
  const effects: (() => void)[] = [];
  const nativeModes: (string | null)[] = [];
  const cleanups: (() => void)[] = [];
  const react = {
    createContext: (value: unknown) => ({ Provider: "Provider", value }),
    useContext: (context: any) => context.value,
    createElement: (type: unknown, props: object, ...children: unknown[]) => ({ type, props: { ...props, children } }),
    useState(initial: unknown) {
      const i = cursor++;
      if (!(i in values)) values[i] = initial;
      return [values[i], (next: unknown) => { values[i] = next; }];
    },
    useCallback: (callback: Function) => callback,
    useEffect(callback: () => void | (() => void), dependencies: unknown[]) {
      const i = cursor++;
      if (values[i] && dependencies.every((value, index) => value === values[i][index])) return;
      values[i] = dependencies;
      effects.push(() => { const cleanup = callback(); if (cleanup) cleanups.push(cleanup); });
    },
  };
  const { ThemeProvider } = load("../src/themes/ThemeProvider.tsx", {
    react,
    "react-native": { useColorScheme: () => systemScheme,
      Appearance: nativeOverride ? { setColorScheme: (mode: string | null) => nativeModes.push(mode) } : {} },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "@/src/store/factory": { createKVStorage: () => ({ getItem: () => read(),
      setItem: (key: string, value: string) => write(key, value) }) },
    "./colors": { colors: { name: "light" }, darkColors: { name: "dark" } },
    "./glass": { glass: {}, darkGlass: {} },
    "./borders": {}, "./fontScale": {}, "./spacing": {}, "./typography": {},
  });
  return {
    saved, nativeModes,
    render() {
      cursor = 0;
      const tree = ThemeProvider({ children: "App" });
      effects.splice(0).forEach((effect) => effect());
      return tree;
    },
    setSystem(scheme: string) { systemScheme = scheme; },
    setRead(callback: typeof read) { read = callback; },
    setWrite(callback: typeof write) { write = callback; },
    unmount() { cleanups.forEach((cleanup) => cleanup()); },
  };
}

const preference = (tree: any) => tree.props.children[0].props.value;

for (const savedMode of [null, "unexpected", "system", "light", "dark"]) {
  test(`appearance hydrates ${savedMode ?? "an unset preference"} without showing the wrong initial theme`, async () => {
    const f = fixture(new Map(savedMode === null ? [] : [["appearance_mode", savedMode]]), "dark");
    assert.equal(f.render(), null);
    await flush();
    const tree = f.render();
    const expectedMode = savedMode === "dark" || savedMode === "system" ? savedMode : "light";
    assert.equal(preference(tree).mode, expectedMode);
    assert.equal(tree.props.value.colorScheme, expectedMode === "light" ? "light" : "dark");
    assert.equal(f.nativeModes.at(-1), expectedMode === "system" ? null : expectedMode);
    assert.equal(f.saved.get("appearance_mode"), savedMode ?? undefined);
  });
}

test("System follows device changes while explicit modes override them and native appearance", async () => {
  const f = fixture(new Map([["appearance_mode", "system"]])); f.render(); await flush();
  let tree = f.render();
  assert.equal(tree.props.value.colorScheme, "light");
  assert.equal(f.nativeModes.at(-1), null);
  f.setSystem("dark");
  assert.equal(f.render().props.value.colorScheme, "dark");
  await preference(tree).setMode("light");
  tree = f.render();
  assert.equal(tree.props.value.colorScheme, "light");
  assert.equal(f.nativeModes.at(-1), "light");
  await preference(tree).setMode("dark");
  f.setSystem("light"); tree = f.render();
  assert.equal(tree.props.value.colorScheme, "dark");
  assert.equal(f.nativeModes.at(-1), "dark");
  await preference(tree).setMode("system");
  assert.equal(f.render().props.value.colorScheme, "light");
  assert.equal(f.nativeModes.at(-1), null);
});

test("appearance persists across provider restarts without profile-specific keys", async () => {
  const f = fixture(); f.render(); await flush();
  await preference(f.render()).setMode("dark"); f.unmount();
  assert.deepEqual([...f.saved], [["appearance_mode", "dark"]]);
  const reopened = fixture(f.saved); reopened.render(); await flush();
  const tree = reopened.render();
  assert.equal(preference(tree).mode, "dark");
  assert.equal(tree.props.value.colorScheme, "dark");
});

test("appearance overrides still work on web without a native appearance setter", async () => {
  const f = fixture(new Map(), "light", false); f.render(); await flush();
  await preference(f.render()).setMode("dark");
  assert.equal(f.render().props.value.colorScheme, "dark");
  assert.equal(f.saved.get("appearance_mode"), "dark");
  assert.equal(f.nativeModes.length, 0);
});

test("failed preference writes preserve the previous selection and report failure to the caller", async () => {
  const f = fixture(); f.render(); await flush();
  f.setWrite(async () => { throw new Error("storage unavailable"); });
  await assert.rejects(preference(f.render()).setMode("dark"), /storage unavailable/);
  assert.equal(preference(f.render()).mode, "light");
  assert.equal(f.saved.size, 0);
});

test("unavailable preference storage falls back to Light even on a dark device", async () => {
  const f = fixture(new Map(), "dark"); f.setRead(async () => { throw new Error("unavailable"); });
  f.render(); await flush();
  const tree = f.render();
  assert.equal(preference(tree).mode, "light");
  assert.equal(tree.props.value.colorScheme, "light");
  assert.equal(f.nativeModes.at(-1), "light");
});

test("glass follows the resolved app theme rather than the device setting", () => {
  for (const colorScheme of ["light", "dark"]) {
    const t = { colorScheme, glass: { chrome: { backgroundColor: "#123456" }, radius: { chrome: 34 },
      blurIntensity: { chrome: 20 }, blurTint: { chrome: "default" } } };
    const { default: GlassSurface } = load("../src/components/glass/GlassSurface.tsx", {
      react: { createElement: (type: unknown, props: object, ...children: unknown[]) => ({ type, props: { ...props, children } }) },
      "@/src/themes": { useTheme: () => t },
      "expo-blur": { BlurView: "BlurView" },
      "react-native": { Platform: { OS: "ios" }, StyleSheet: { absoluteFillObject: {} }, View: "View" },
    });
    const tree = GlassSurface({ variant: "chrome", children: "content" });
    const blur = tree.props.children[0].props.children[0];
    assert.equal(blur.props.tint, colorScheme === "dark" ? "systemUltraThinMaterialDark" : "default");
  }
});
