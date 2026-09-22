import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(path: string, modules: Record<string, unknown>, expose = "") {
  const source = readFileSync(new URL(path, import.meta.url), "utf8") + expose;
  const { outputText } = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } });
  const exports: Record<string, any> = {};
  runInNewContext(outputText, { exports, require: (name: string) => modules[name] ?? {} });
  return exports;
}
const { parseConversationActionConfirmation: parse } = load("../src/services/conversation.service.ts", {},
  "\nexports.parseConversationActionConfirmation = parseConversationActionConfirmation;");
const comparison = {
  current_label: "Actual", proposed_label: "Propuesta", changed_label: "Con cambios",
  fields: [
    { id: "total", label: "Total de productos", current_value: "₡130,000.00", proposed_value: "₡130,000.00", changed: false, layout: "inline" },
    { id: "description", label: "Descripción", current_value: "  Original\ncompleto.  ", proposed_value: "  Original\ncompleto. Además ofrecemos un kit.  ", changed: true, layout: "stacked" },
  ],
};
const confirmation = {
  id: "review", code: "DB_REVIEW", title: "Cambios propuestos",
  fields: [{ label: "Oferta actual", value_source: "current_terms", value: "Legacy current" },
    { label: "Oferta propuesta", value_source: "proposed_terms", value: "Legacy proposed" }],
  comparison, secondary_action_code: "DB_REJECT",
};

test("comparison parsing preserves exact text, server change flags, order and the configured secondary action", () => {
  const result = parse(confirmation);
  assert.deepEqual(JSON.parse(JSON.stringify(result.comparison)), comparison);
  assert.equal(result.secondary_action_code, "DB_REJECT");
  assert.equal(result.fields.length, 2);
});
test("missing or malformed comparison falls back to complete legacy summaries, never a partial comparison", () => {
  for (const invalid of [undefined, null, [], {}, { ...comparison, fields: [] },
    { ...comparison, current_label: "" },
    { ...comparison, fields: [...comparison.fields, comparison.fields[0]] },
    { ...comparison, fields: [comparison.fields[0], { ...comparison.fields[1], changed: "true" }] },
    { ...comparison, fields: [{ ...comparison.fields[0], current_value: null }] },
    { ...comparison, fields: [{ ...comparison.fields[0], layout: "unknown" }] }]) {
    const result = parse({ ...confirmation, comparison: invalid });
    assert.equal(result.comparison, undefined);
    assert.deepEqual(Array.from(result.fields, (row: any) => row.value), ["Legacy current", "Legacy proposed"]);
  }
});

type Element = { type: string; props: Record<string, any> };
const theme = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  colors: { border: "#ddd" },
  typography: { subtitle: { fontFamily: "Poppins_600SemiBold" } },
};
function renderer() {
  return load("../src/components/popup/SummaryComparison.tsx", {
    react: {
      createElement: (type: string | Function, props: object, ...children: any[]) =>
        typeof type === "function" ? type({ ...props, children }) : { type, props: { ...props, children } },
      useMemo: (callback: Function) => callback(),
    },
    "@/src/themes": { useTheme: () => theme },
    "@/src/components/Text": { Text: "Text" },
    "react-native": { View: "View", Pressable: "Pressable",
      StyleSheet: { create: (styles: any) => styles, hairlineWidth: 1 } },
  });
}
function render(fields = comparison.fields, showFull = false, onShowFull = () => {}) {
  const Component = renderer().default;
  return Component({ comparison: {
    currentLabel: comparison.current_label, proposedLabel: comparison.proposed_label, changedLabel: comparison.changed_label,
    fields: fields.map((field) => ({
      id: field.id, label: field.label, currentValue: field.current_value, proposedValue: field.proposed_value,
      layout: field.layout, changed: field.changed,
    })),
  }, showFull, onShowFull });
}
function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return value?.props ? [value, ...nodes(value.props.children)] : [];
}
function text(value: any): string {
  if (Array.isArray(value)) return value.map(text).join("");
  return value?.props ? text(value.props.children) : typeof value === "string" ? value : "";
}
test("literal text changes show only exact additions, removals or replacements", () => {
  const getChange = renderer().getDescriptionChange;
  assert.deepEqual(JSON.parse(JSON.stringify(getChange("Oferta actual.", "Oferta actual. Además ofrecemos un kit."))),
    { label: "Se añadió", proposed: "Además ofrecemos un kit." });
  assert.deepEqual(JSON.parse(JSON.stringify(getChange("Incluye tramado gratis.", "Incluye tramado."))),
    { label: "Se quitó", current: "gratis" });
  assert.deepEqual(JSON.parse(JSON.stringify(getChange("Tramado gratis con la compra.", "Tramado por separado con la compra."))),
    { label: "Se reemplazó", current: "gratis", proposed: "por separado" });
  assert.deepEqual(JSON.parse(JSON.stringify(getChange("foto", "fotos"))),
    { label: "Texto actualizado", current: "foto", proposed: "fotos" });
});
test("short review shows only the changed description and opens complete terms", () => {
  let opened = 0;
  const tree = render(comparison.fields, false, () => { opened += 1; });
  assert.ok(text(tree).includes("Además ofrecemos un kit."));
  assert.ok(!text(tree).includes("Original\ncompleto."));
  assert.ok(!text(tree).includes("₡130,000.00"));
  assert.ok(!text(tree).includes("Total de productos"));
  assert.equal(nodes(tree).filter((node) => node.props.accessible).length, 1);
  const link = nodes(tree).find((node) => node.type === "Pressable");
  assert.equal(link?.props.accessibilityLabel, "Ver ofertas completas");
  link?.props.onPress();
  assert.equal(opened, 1);
});
test("complete terms show every full value from both offers without truncation", () => {
  const tree = render(comparison.fields, true);
  assert.ok(text(tree).includes("Oferta actual"));
  assert.ok(text(tree).includes("Oferta propuesta"));
  for (const field of comparison.fields) {
    assert.ok(text(tree).includes(field.current_value));
    assert.ok(text(tree).includes(field.proposed_value));
  }
  assert.equal(nodes(tree).filter((node) => node.type === "Pressable").length, 0);
  assert.ok(nodes(tree).every((node) => node.props.numberOfLines === undefined));
});
test("changed photo paths with equal counts remain visible; a total price does not appear twice", () => {
  const fields = [
    { id: "total", label: "Total de productos", current_value: "₡130,000.00",
      proposed_value: "₡140,000.00", changed: true, layout: "inline" },
    { id: "price", label: "Precio indicado", current_value: "₡130,000.00 en total",
      proposed_value: "₡140,000.00 en total", changed: true, layout: "inline" },
    { id: "photos", label: "Fotos", current_value: "1", proposed_value: "1", changed: true, layout: "inline" },
  ];
  const tree = render(fields);
  assert.ok(text(tree).includes("₡140,000.00"));
  assert.ok(!text(tree).includes("Precio indicado"));
  assert.ok(text(tree).includes("Las fotos cambiaron."));
});
