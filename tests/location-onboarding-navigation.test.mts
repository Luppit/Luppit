import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function navigationGate() {
  let state = "location_unavailable";
  let pathname = "/auth";
  const modules: Record<string, unknown> = {
    react: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }), Fragment: "Fragment" },
    "expo-router": { Redirect: "Redirect", usePathname: () => pathname, useLocalSearchParams: () => ({}) },
    "./ActiveProfileContext": { useActiveProfile: () => ({ state, activeProfile: { profile: { email: "verified", email_opt_in: true, email_opt_in_at: "verified" } } }) },
    "@/src/components/navbar/useEmailSetupGate": {
      isProfileEmailSetupComplete: () => true,
      isEmailSetupAllowedAppPath: () => true,
    },
  };
  const exports: Record<string, any> = {};
  const source = readFileSync(new URL("../src/components/profile/EmailSetupNavigationGate.tsx", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText, { exports, require: (name: string) => {
    assert.ok(name in modules, `Unmocked module ${name}`);
    return modules[name];
  } });
  return {
    render(path: string) { pathname = path; return exports.default({ children: "content" }); },
    setState(value: string) { state = value; },
  };
}

test("a persisted unavailable seller always reenters the availability screen after login and deep links", () => {
  const gate = navigationGate();
  for (const path of ["/auth", "/", "/chats", "/offer", "/marketplace-hub-section", "/request/shared"]) {
    const rendered = gate.render(path);
    assert.equal(rendered.type, "Redirect");
    assert.equal(rendered.props.href.pathname, "/(detail)/location-unavailable");
  }
});

test("unavailable sellers retain location correction, account management and legal access", () => {
  const gate = navigationGate();
  for (const path of ["/location-unavailable", "/business-location-edit", "/account-settings", "/faq", "/legal-document"]) {
    assert.equal(gate.render(path).type, "Fragment");
  }
  gate.setState("ready");
  assert.equal(gate.render("/chats").type, "Fragment");
});
