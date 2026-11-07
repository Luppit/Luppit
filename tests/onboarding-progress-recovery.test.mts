import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as legalReview from "../src/components/legal/signupLegalReview.ts";

type Node = { type: unknown; props: Record<string, any> };

async function settle() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function load<T>(path: string, modules: Record<string, unknown>, expose = ""): T {
  const source = readFileSync(new URL(path, import.meta.url), "utf8") + expose;
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name: string) {
      assert.ok(name in modules, `Unmocked import: ${name}`);
      return modules[name];
    },
  });
  return exports as T;
}

function hooks() {
  let index = 0;
  const values: any[] = [];
  const effects: (() => unknown)[] = [];
  const react = {
    Fragment: "Fragment",
    createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({
      type,
      props: { ...(props as object), children },
    }),
    useState(initial: unknown) {
      const key = index++;
      if (!(key in values)) {
        values[key] = typeof initial === "function" ? initial() : initial;
      }
      return [values[key], (next: any) => {
        values[key] = typeof next === "function" ? next(values[key]) : next;
      }];
    },
    useRef(initial: unknown) {
      const key = index++;
      if (!(key in values)) values[key] = { current: initial };
      return values[key];
    },
    useMemo: (fn: () => unknown) => fn(),
    useCallback: (fn: unknown) => fn,
    useEffect(fn: () => unknown) {
      const key = index++;
      if (!(key in values)) {
        values[key] = true;
        effects.push(fn);
      }
    },
  };
  return {
    react,
    render<T>(fn: () => T) { index = 0; return fn(); },
    effects() { effects.splice(0).forEach((fn) => fn()); },
  };
}

function descendants(node: unknown): Node[] {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const current = node as Node;
  return [current, ...descendants(current.props.children)];
}

const theme = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borders: { sm: 8 }, colors: {}, glass: { radius: { chrome: 28 } },
};
const native = {
  StyleSheet: { create: (value: unknown) => value },
  View: "View", ScrollView: "ScrollView", Pressable: "Pressable",
  Platform: { OS: "ios" },
};

function signupHarness() {
  const h = hooks();
  const replacements: unknown[] = [];
  const module = load<{
    default: () => Node;
    SignupEntryStep: (props: any) => Node;
  }>("../app/(auth)/signup.tsx", {
    react: h.react,
    "react-native": native,
    "expo-router": { Link: "Link", router: { replace: (route: unknown) => replacements.push(route) } },
    "@/src/components/inputPhone/InputPhone": { defaultCountryCode: "506" },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/stepper/Stepper": { __esModule: true, default: "Stepper" },
    "@/src/components/tabs/Tab": { Tabs: "Tabs" },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/onboarding/SellerSetupOverview": { __esModule: true, default: "SellerSetupOverview" },
    "@/src/components/legal/signupLegalReview": legalReview,
    "@/src/lib/supabase/auth": {},
    "@/src/services/legal-document.service": {
      LEGAL_DOCUMENT_CODES: { termsConditions: "terms_conditions", privacyPolicy: "privacy_policy" },
    },
    "@/src/themes": { useTheme: () => theme, borders: theme.borders, spacing: theme.spacing },
    "@/src/utils": {},
    "./signup/CreateUserFormTab": { __esModule: true, default: "Form" },
    "./signup/VerifyCode": { __esModule: true, default: "VerifyCode" },
  }, "\nexport { SignupEntryStep };\n");
  return {
    h,
    module,
    replacements,
    stepper() {
      const tree = h.render(module.default);
      return descendants(tree).find((node) => node.type === "Stepper")!;
    },
    entry() {
      return this.stepper().props.steps[0].render({ next() {} }) as Node;
    },
  };
}

test("signup Back returns either role to welcome without navigation history", () => {
  for (const userType of ["buyer", "seller"] as const) {
    legalReview.preserveSignupForLegalReview({ userType, phoneNumber: "12345678", legalAccepted: true });
    const h = signupHarness();
    h.stepper().props.onBackAtFirstStep();
    assert.deepEqual(h.replacements, ["/(auth)/auth"]);
    assert.equal(legalReview.getSignupLegalReviewState(), null);
  }
});

test("both legal links preserve the latest seller phone and consent across signup remount", () => {
  for (const documentCode of ["terms_conditions", "privacy_policy"]) {
    legalReview.clearSignupLegalReviewState();
    const h = signupHarness();
    const entry = h.h.render(() => h.module.SignupEntryStep({
      next() {}, userType: "seller", setUserType() {},
      values: { phoneNumber: "12345678" }, setValues() {},
      legalAccepted: true, onToggleLegal() {},
    }));
    const tabs = descendants(entry).find((node) => node.type === "Tabs")!;
    const sellerSupport = tabs.props.tabs[1].content.props.supportingContent;
    const legalElement = descendants(sellerSupport).find((node) => typeof node.type === "function")!;
    const legalContent = (legalElement.type as (props: unknown) => Node)(legalElement.props);
    const link = descendants(legalContent).find((node) => node.type === "Link" && node.props.href.params.code === documentCode)!;
    link.props.onPress();

    const remounted = signupHarness();
    const restored = remounted.entry();
    assert.equal(restored.props.userType, "seller");
    assert.equal(restored.props.values.phoneNumber, "12345678");
    assert.equal(restored.props.legalAccepted, true);
    remounted.h.effects();
    assert.equal(legalReview.getSignupLegalReviewState(), null);

    const laterSignup = signupHarness().entry();
    assert.equal(laterSignup.props.userType, "buyer");
    assert.equal(laterSignup.props.values.phoneNumber, "");
    assert.equal(laterSignup.props.legalAccepted, false);
  }
});

test("the detail fallback sends legal-review native back to signup without changing other back behavior", () => {
  for (const hasSignup of [false, true]) {
    for (const hasHistory of [false, true]) {
      legalReview.clearSignupLegalReviewState();
      if (hasSignup) legalReview.preserveSignupForLegalReview({
        userType: "seller", phoneNumber: "12345678", legalAccepted: false,
      });
      const calls: string[] = [];
      const module = load<{ default: () => unknown }>("../app/(detail)/fallback.tsx", {
        react: { useEffect: (fn: () => unknown) => fn() },
        "@/src/components/legal/signupLegalReview": legalReview,
        "expo-router": { router: {
          canGoBack: () => hasHistory,
          back: () => calls.push("back"),
          replace: (href: string) => calls.push(`replace:${href}`),
          dismissTo: (href: string) => calls.push(`dismiss:${href}`),
        } },
      });
      module.default();
      assert.deepEqual(calls, [hasSignup ? "dismiss:/(auth)/signup" : hasHistory ? "back" : "replace:/(tabs)"]);
    }
  }
  legalReview.clearSignupLegalReviewState();
});

test("starting a fresh signup clears a previously abandoned legal review", () => {
  legalReview.preserveSignupForLegalReview({
    userType: "seller", phoneNumber: "12345678", legalAccepted: true,
  });
  const paths: string[] = [];
  const h = hooks();
  const module = load<{ default: () => Node }>("../app/(auth)/auth.tsx", {
    react: h.react,
    "react-native": { ...native, Image: "Image" },
    "expo-router": { Link: "Link", router: { push: (href: string) => paths.push(href) } },
    "@/src/components/button/Button": { __esModule: true, default: "Button" },
    "@/src/components/BundledSvg": { BundledSvg: "BundledSvg" },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/legal/signupLegalReview": legalReview,
    "@/src/services/legal-document.service": { LEGAL_DOCUMENT_CODES: {} },
    "@/src/themes": { colors: {}, spacing: theme.spacing },
    "../../assets/images/logo-icon.svg": 1,
    "../../assets/images/icon.png": 2,
  });
  const button = descendants(module.default()).find((node) => node.props.title === "Crear cuenta con teléfono")!;
  button.props.onPress();
  assert.equal(legalReview.getSignupLegalReviewState(), null);
  assert.deepEqual(paths, ["/(auth)/signup"]);
});

test("legal header and Android native back use the explicit signup return", () => {
  const h = hooks();
  const routes: string[] = [];
  let nativeBack!: () => void;
  const module = load<{ default: (props: unknown) => Node }>("../app/(detail)/detail-top-bar.tsx", {
    react: h.react,
    "react-native": native,
    "expo-router": { router: {
      canGoBack: () => true,
      back: () => routes.push("back"),
      replace: (href: string) => routes.push(`replace:${href}`),
      dismissTo: (href: string) => routes.push(`dismiss:${href}`),
    } },
    "@/src/utils/useAndroidBackAction": { useAndroidBackAction: (fn: () => void) => { nativeBack = fn; } },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/glass/GlassSurface": { __esModule: true, default: "GlassSurface" },
    "@/src/services/popup.service": {},
    "@/src/services/purchase.request.service": {},
    "@/src/themes": { useTheme: () => theme },
    "@/src/utils/useToast": {},
    "@/src/utils/purchaseRequestLink": {},
  });
  const tree = h.render(() => module.default({ returnToSignup: true, hideMenu: true, topInset: 0 }));
  const back = descendants(tree).find((node) => node.props.accessibilityLabel === "Volver")!;
  assert.equal(back.props.onPress, nativeBack);
  back.props.onPress();
  assert.deepEqual(routes, ["dismiss:/(auth)/signup"]);
});

function photoHarness() {
  const h = hooks();
  const target = { kind: "business", entityId: "test-business", imagePath: null, imageUrl: null, canManage: true };
  const savedFiles: any[] = [];
  let response: () => Promise<unknown> = async () => ({ ok: false, error: { message: "El servicio no está disponible temporalmente." } });
  let selectedUri = "file:///test-photo.jpg";
  let exits = 0;
  const module = load<{ default: () => Node }>("../app/(modal)/profile-picture-edit.tsx", {
    react: h.react,
    "react-native": native,
    "@/src/utils/useAndroidBackAction": { goBackOrHome: () => exits++ },
    "@/src/utils/useAndroidLeaveGuard": { useAndroidLeaveGuard: () => async (fn: () => unknown) => fn() },
    "@/src/components/button/Button": { __esModule: true, default: "Button" },
    "@/src/components/groupedList/GroupedList": { GroupedList: "GroupedList", GroupedListRow: "GroupedListRow", GroupedListSection: "GroupedListSection" },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/loading/LoadingState": { __esModule: true, default: "LoadingState" },
    "@/src/components/profile/ProfilePicture": { __esModule: true, default: "ProfilePicture" },
    "@/src/components/profile/ActiveProfileContext": { useActiveProfile: () => ({ activeProfile: { profile: { id: "test-profile" }, businessName: "Negocio de prueba" }, refreshProfiles: async () => {} }) },
    "@/src/components/surface/styles": { createRoundedSurfaceStyle: () => ({}) },
    "@/src/components/Text": { Text: "Text" },
    "@/src/services/profile-image.service": {
      getCurrentProfileImageTarget: async () => ({ ok: true, data: target }),
      saveCurrentProfileImage: async (file: unknown) => { savedFiles.push(file); return response(); },
    },
    "@/src/services/popup.service": {},
    "@/src/services/toast.service": {},
    "@/src/themes": { useTheme: () => theme },
    "@/src/utils/useToast": { showSuccess() {}, showError() {} },
    "expo-image-picker": {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: selectedUri, fileName: "photo.jpg", mimeType: "image/jpeg", fileSize: 10 }] }),
    },
  });
  return {
    h, savedFiles,
    get exits() { return exits; },
    setResponse(next: typeof response) { response = next; },
    setSelectedUri(next: string) { selectedUri = next; },
    tree: () => h.render(module.default),
    button(title: string) {
      const tree = h.render(module.default);
      const button = descendants(tree).find((node) => node.type === "Button" && node.props.title === title);
      assert.ok(button, `Missing button: ${title}`);
      return button;
    },
  };
}

async function readyPhoto() {
  const h = photoHarness();
  h.tree();
  h.h.effects();
  await settle();
  await h.button("Elegir foto").props.onPress();
  await settle();
  return h;
}

test("a failed photo save retains the selected image, exposes a persistent alert and retries that same file", async () => {
  const h = await readyPhoto();
  const firstSave = h.button("Guardar cambios");
  await firstSave.props.onPress();
  await settle();
  assert.equal(h.exits, 0);
  const failedTree = h.tree();
  const alert = descendants(failedTree).find((node) => node.props.accessibilityRole === "alert")!;
  assert.ok(alert);
  assert.equal(alert.props.accessibilityLiveRegion, "polite");
  const preview = descendants(failedTree).find((node) => node.type === "ProfilePicture")!;
  assert.equal(preview.props.imageUrl, "file:///test-photo.jpg");

  let finish!: (value: unknown) => void;
  h.setResponse(() => new Promise((resolve) => { finish = resolve; }));
  const retry = h.button("Reintentar guardar foto");
  retry.props.onPress();
  await retry.props.onPress();
  await settle();
  assert.equal(h.savedFiles.length, 2, "repeated taps must not duplicate the upload");
  assert.equal(h.button("Guardar cambios").props.loading, true);
  assert.equal(h.button("Guardar cambios").props.disabled, true);
  finish({ ok: true, data: { kind: "business", entityId: "test-business", imagePath: "saved-photo.jpg", imageUrl: "https://example.test/saved-photo.jpg", canManage: true } });
  await settle();
  assert.equal(h.savedFiles[0], h.savedFiles[1]);
  assert.equal(h.exits, 1);
  assert.equal(descendants(h.tree()).some((node) => node.props.accessibilityRole === "alert"), false);
});

test("an unexpected photo save failure stays recoverable, and a replacement image clears the old error", async () => {
  const h = await readyPhoto();
  h.setResponse(async () => { throw new Error("network interrupted"); });
  await h.button("Guardar cambios").props.onPress();
  await settle();
  assert.equal(h.button("Reintentar guardar foto").props.disabled, false);
  assert.equal(h.exits, 0);
  h.setSelectedUri("file:///replacement.jpg");
  await h.button("Elegir otra foto").props.onPress();
  await settle();
  assert.equal(h.button("Guardar cambios").props.disabled, false);
  const tree = h.tree();
  assert.equal(descendants(tree).some((node) => node.props.accessibilityRole === "alert"), false);
  assert.equal(descendants(tree).find((node) => node.type === "ProfilePicture")!.props.imageUrl, "file:///replacement.jpg");
});

async function emailSetupHarness() {
  const h = hooks();
  const reuse: unknown[] = [];
  const send: unknown[] = [];
  const verify: unknown[] = [];
  let exits = 0;
  const module = load<{ default: () => Node }>("../app/(modal)/email-setup.tsx", {
    react: h.react,
    "react-native": { ...native, Keyboard: { dismiss() {} }, TouchableWithoutFeedback: "TouchableWithoutFeedback" },
    "@/src/utils/useAndroidBackAction": { goBackOrHome: () => exits++ },
    "@/src/utils/useAndroidLeaveGuard": { useAndroidLeaveGuard: () => (fn: () => unknown) => fn() },
    "@/src/components/button/Button": { __esModule: true, default: "Button" },
    "@/src/components/groupedList/GroupedList": { GroupedListRow: "GroupedListRow", GroupedListSection: "GroupedListSection" },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/inputField/InputField": { TextField: "TextField" },
    "@/src/components/loading/LoadingState": { __esModule: true, default: "LoadingState" },
    "@/src/components/otpValidator/OtpValidator": { __esModule: true, default: "OtpValidator" },
    "@/src/components/profile/ActiveProfileContext": { useActiveProfile: () => ({ activeProfile: { profile: { id: "seller" }, role: "seller" } }) },
    "@/src/components/Text": { Text: "Text" },
    "@/src/services/profile.service": {
      getCurrentProfileEmailSetupStatus: async () => ({ ok: true, data: { email: null, emailOptIn: false } }),
      getCurrentProfileVerifiedEmailOptions: async () => ({ ok: true, data: ["account@example.test"] }),
      reuseCurrentProfileVerifiedEmail: async (input: unknown) => { reuse.push(input); return { ok: true }; },
      requestCurrentProfileEmailSetupVerification: async (input: unknown) => { send.push(input); return { ok: true }; },
      verifyCurrentProfileEmailSetup: async (input: unknown) => { verify.push(input); return { ok: true }; },
    },
    "@/src/themes": { useTheme: () => theme },
    "@/src/utils/useToast": { showError() {}, showMissingFields() {}, showSuccess() {} },
  });
  const nodes = () => descendants(h.render(module.default));
  const find = (predicate: (node: Node) => boolean) => {
    const node = nodes().find(predicate);
    assert.ok(node);
    return node.props;
  };
  nodes();
  h.effects();
  await settle();
  return {
    reuse, send, verify,
    get exits() { return exits; },
    find,
    button: (title: string) => find((node) => node.type === "Button" && node.props.title === title),
    consent: () => find((node) => node.props.accessibilityRole === "checkbox").onPress(),
  };
}

test("seller email reuse requires consent and does not send a duplicate verification code", async () => {
  const h = await emailSetupHarness();
  h.button("Usar este correo").onPress();
  await settle();
  assert.equal(h.reuse.length, 0);
  assert.equal(h.send.length, 0);
  h.consent();
  const { onPress } = h.button("Usar este correo");
  onPress();
  onPress();
  await settle();
  assert.deepEqual(JSON.parse(JSON.stringify(h.reuse)), [{ email: "account@example.test", emailOptIn: true }]);
  assert.equal(h.send.length, 0);
  assert.equal(h.exits, 1);
});

test("a separate seller contact still goes through email OTP", async () => {
  const h = await emailSetupHarness();
  h.find((node) => node.props.label === "Verificar otro correo del negocio").onPress();
  h.find((node) => node.type === "TextField").onChangeText("sales@example.test");
  h.consent();
  h.button("Enviar código").onPress();
  await settle();
  assert.deepEqual(JSON.parse(JSON.stringify(h.send)), [{ email: "sales@example.test" }]);
  assert.equal(h.reuse.length, 0);
  assert.equal(h.exits, 0);
  h.find((node) => node.type === "OtpValidator").onChange("1234");
  h.button("Verificar correo").onPress();
  await settle();
  assert.deepEqual(JSON.parse(JSON.stringify(h.verify)), [{ email: "sales@example.test", token: "1234", emailOptIn: true }]);
  assert.equal(h.exits, 1);
});
