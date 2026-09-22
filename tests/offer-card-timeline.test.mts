import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Exercise the actual component's disclosure and callbacks with synthetic props.
// Shared native rendering and React scheduling are verified separately.
type Element = { type: string; props: Record<string, any> };
const current = {
  code: "shipping", label: "El vendedor realizó el envío.", icon: "truck",
  pre_label: "Tu acción", detail: "Confirma en el chat cuando recibas la compra.",
  method_kind: "shipping", method_label: "Envío", is_next: true, is_completed: false,
};
const history = [
  { code: "available", label: "Disponibilidad confirmada desde DB", icon: "check", reached_at_label: "16 sept 2026 · 6:32 p. m.", style_code: "success" },
  { code: "offer", label: "Oferta recibida desde DB", icon: "tag", reached_at_label: "10 sept 2026 · 7:26 p. m.", style_code: "info" },
].map((step) => ({ ...step, is_next: false, is_completed: true }));

function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value?.props) return [];
  return [value, ...nodes(value.props.children), ...nodes(value.props.body), ...nodes(value.props.footerLeft), ...nodes(value.props.headerRight)];
}

function visibleText(value: any): string[] {
  if (Array.isArray(value)) return value.flatMap(visibleText);
  if (typeof value === "string") return [value];
  if (!value?.props) return [];
  return [value.props.children, value.props.body, value.props.footerLeft, value.props.headerRight].flatMap(visibleText);
}

function fixture() {
  let cursor = 0;
  const values: any[] = [];
  const react = {
    createElement: (type: string, props: object, ...children: any[]) => ({ type, props: { ...props, children } }),
    useMemo: (callback: Function) => callback(),
    useState(initial: any) {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], (next: any) => { values[index] = typeof next === "function" ? next(values[index]) : next; }];
    },
  };
  const source = readFileSync(new URL("../src/components/offerCard/OfferCard.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, esModuleInterop: true,
  } });
  const pricingExports: Record<string, any> = {};
  const pricingSource = readFileSync(new URL("../src/utils/conversationOfferPrice.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(pricingSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: pricingExports });
  const modules: Record<string, any> = {
    react,
    "react-native": { View: "View", Pressable: "Pressable", StyleSheet: { create: (styles: object) => styles, hairlineWidth: 0.5 } },
    "@/src/components/Icon": { Icon: "Icon" },
    "@/src/components/Text": { Text: "Text" },
    "@/src/components/button/Button": { default: "Button", __esModule: true },
    "@/src/components/chip/LuppitChip": { default: "Chip", __esModule: true },
    "@/src/components/marketplaceHub/MarketplaceCardFrame": { default: "Card", __esModule: true },
    "@/src/themes": { useTheme: () => ({
      spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
      typography: { subtitle: { fontFamily: "Poppins_600SemiBold" } },
      colors: { info: "blue", success: "green", textDark: "black", textMedium: "gray" },
    }) },
    "@/src/utils/conversationOfferPrice": pricingExports,
  };
  const exports: Record<string, any> = {};
  runInNewContext(outputText, { exports, require(name: string) {
    assert.ok(name in modules, `Unmocked import: ${name}`);
    return modules[name];
  } });
  const props: Record<string, any> = {
    offer: { id: "offer-A", business_name: "Negocio de prueba" },
    timeline: [current, ...history], connectLabel: "Ver chat",
  };
  return { props, render() { cursor = 0; return exports.default(props); } };
}

const disclosure = (tree: Element) => nodes(tree).find((node) => node.props.accessibilityLabel?.startsWith("Historial de la compra,"));

test("current status stays visible; history expands in DB order with labels, dates and semantic icons intact", () => {
  const f = fixture();
  f.props.timeline = [history[0], current, history[1]];
  let tree = f.render();
  assert.ok(visibleText(tree).includes(current.label));
  assert.ok(visibleText(tree).includes(current.detail));
  assert.ok(!visibleText(tree).includes(history[0].label));
  assert.equal(disclosure(tree)?.props.accessibilityLabel, "Historial de la compra, 2 eventos");
  assert.equal(disclosure(tree)?.props.accessibilityState.expanded, false);
  disclosure(tree)!.props.onPress();
  tree = f.render();
  const text = visibleText(tree);
  assert.equal(disclosure(tree)?.props.accessibilityState.expanded, true);
  assert.ok(text.indexOf(history[0].label) < text.indexOf(history[1].label));
  assert.equal(text.filter((value) => value === current.label).length, 1);
  for (const step of history) assert.ok(text.includes(step.reached_at_label));
  assert.ok(nodes(tree).some((node) => node.type === "Icon" && node.props.name === "check" && node.props.color === "green"));
  assert.ok(nodes(tree).some((node) => node.type === "Icon" && node.props.name === "tag" && node.props.color === "blue"));
  disclosure(tree)!.props.onPress();
  assert.ok(!visibleText(f.render()).includes(history[0].label));
});

test("completed purchases retain their latest DB event as the summary and single events need no disclosure", () => {
  const f = fixture();
  f.props.timeline = history;
  let tree = f.render();
  assert.ok(visibleText(tree).includes(history[0].label));
  assert.ok(!visibleText(tree).includes("Tu acción"));
  assert.equal(disclosure(tree)?.props.accessibilityLabel, "Historial de la compra, 1 evento");
  f.props.timeline = [history[0]];
  tree = f.render();
  assert.ok(visibleText(tree).includes(history[0].label));
  assert.equal(disclosure(tree), undefined);
});

test("uncompleted DB entries and pickup actions are never hidden inside collapsed history", () => {
  const f = fixture();
  const pending = { ...current, code: "pending", label: "Pendiente desde DB", is_next: false };
  f.props.timeline = [current, pending, ...history];
  f.props.timelineActions = { type: "PickupAction", props: {} };
  const tree = f.render();
  assert.ok(visibleText(tree).includes(pending.label));
  assert.ok(nodes(tree).some((node) => node.type === "PickupAction"));
  assert.equal(disclosure(tree)?.props.accessibilityLabel, "Historial de la compra, 2 eventos");
});

test("loading, errors, empty history, updated counts and existing callbacks remain functional", () => {
  const f = fixture();
  const calls: string[] = [];
  f.props.onConnect = () => calls.push("chat");
  f.props.onMenuPress = () => calls.push("menu");
  f.props.onTimelineRetry = () => calls.push("retry");
  let tree = f.render();
  nodes(tree).find((node) => node.type === "Button")!.props.onPress();
  nodes(tree).find((node) => node.props.accessibilityLabel === "Más opciones de la oferta")!.props.onPress();
  disclosure(tree)!.props.onPress();
  f.props.timeline = [current, history[0]];
  tree = f.render();
  assert.equal(disclosure(tree)?.props.accessibilityLabel, "Historial de la compra, 1 evento");
  assert.ok(!visibleText(tree).includes(history[1].label));
  f.props.timelineLoading = true;
  tree = f.render();
  assert.ok(visibleText(tree).includes("Cargando seguimiento…"));
  assert.equal(disclosure(tree), undefined);
  assert.ok(!visibleText(tree).includes(current.label));
  f.props.timelineLoading = false;
  f.props.timelineError = "Error de prueba";
  tree = f.render();
  assert.equal(disclosure(tree), undefined);
  nodes(tree).find((node) => node.props.accessibilityLabel === "Reintentar cargar el seguimiento")!.props.onPress();
  assert.deepEqual(calls, ["chat", "menu", "retry"]);
  f.props.timelineError = null;
  f.props.timeline = [];
  tree = f.render();
  assert.equal(disclosure(tree), undefined);
  assert.ok(!visibleText(tree).includes("Seguimiento"));
});

test("price breakdown keeps the supplied subtotal and handles total-only and legacy offers", () => {
  const f = fixture();
  Object.assign(f.props.offer, { price_basis: "UNIT", price: 25000, quantity_offered: 4,
    offer_product_subtotal: 90000, offer_currency_code: "CRC" });
  let text = visibleText(f.render());
  assert.ok(text.includes("4 unidades"));
  assert.ok(text.includes("₡25,000"));
  assert.ok(text.includes("₡90,000"));
  assert.ok(!text.includes("₡100,000"));
  Object.assign(f.props.offer, { price_basis: "TOTAL", price: 120, offer_product_subtotal: null, offer_currency_code: "USD" });
  text = visibleText(f.render());
  assert.ok(text.includes("$120"));
  assert.ok(!text.includes("4 unidades"));
  Object.assign(f.props.offer, { price_basis: null, offer_price_summary: "Precio acordado desde DB" });
  text = visibleText(f.render());
  assert.ok(text.includes("Precio acordado desde DB"));
});
