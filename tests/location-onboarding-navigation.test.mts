import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function navigationGate() {
  let state = "location_unavailable";
  let pathname = "/auth";
  let group = "(chat)";
  let role = "seller";
  let businessVerificationStatus: string | null = null;
  let emailComplete = true;
  const modules: Record<string, unknown> = {
    react: { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }), Fragment: "Fragment" },
    "expo-router": {
      Redirect: "Redirect", usePathname: () => pathname, useLocalSearchParams: () => ({}),
      useSegments: () => [group, pathname.slice(1)],
    },
    "./ActiveProfileContext": { useActiveProfile: () => ({ state, activeProfile: { role, businessVerificationStatus, profile: {} } }) },
    "@/src/components/navbar/useEmailSetupGate": {
      isProfileEmailSetupComplete: () => emailComplete,
      isEmailSetupAllowedAppPath: (path: string) => path === "/",
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
    setRole(value: string) { role = value; },
    setBusinessVerificationStatus(value: string) { businessVerificationStatus = value; },
    setGroup(value: string) { group = value; },
    setEmailComplete(value: boolean) { emailComplete = value; },
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

test("an email-incomplete buyer can open only the request assistant draft route", () => {
  const gate = navigationGate();
  gate.setState("ready");
  gate.setEmailComplete(false);
  assert.equal(gate.render("/chat").type, "Redirect");
  gate.setRole("buyer");
  assert.equal(gate.render("/chat").type, "Fragment");
  gate.setGroup("(conversation)");
  assert.equal(gate.render("/chat").props.href, "/");
  for (const path of ["/chats", "/create", "/chat/other"]) {
    assert.equal(gate.render(path).props.href, "/");
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

test("pending sellers can reach only the setup editors while marketplace routes stay gated", () => {
  const gate = navigationGate();
  gate.setState("business_verification_required");
  gate.setBusinessVerificationStatus("PENDING");
  const editors = ["/business-categories", "/business-location-edit", "/profile-picture-edit"];
  for (const path of editors) assert.equal(gate.render(path).type, "Fragment");
  for (const path of ["/", "/offers", "/offer", "/business-invitations"]) {
    assert.equal(gate.render(path).props.href.pathname, "/(detail)/business-verification");
  }
  gate.setBusinessVerificationStatus("NEEDS_ACTION");
  for (const path of editors) {
    assert.equal(gate.render(path).props.href.pathname, "/(detail)/business-verification");
  }
});
