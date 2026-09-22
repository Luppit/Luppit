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
  spacing: { xs: 4, sm: 8, md: 16 }, borders: { sm: 8 },
  colors: { border: "#ddd", primaryLight: "#DBE4D0" },
  typography: { subtitle: { fontFamily: "Poppins_600SemiBold" } },
};
function render(width: number, fontScale: number) {
  const Component = load("../src/components/popup/SummaryComparison.tsx", {
    react: {
      createElement: (type: string, props: object, ...children: any[]) => ({ type, props: { ...props, children } }),
      useMemo: (callback: Function) => callback(),
    },
    "@/src/themes": { useTheme: () => theme },
    "@/src/components/Text": { Text: "Text" },
    "react-native": { View: "View", StyleSheet: { create: (styles: any) => styles, hairlineWidth: 1 },
      useWindowDimensions: () => ({ width, fontScale }) },
  }).default;
  return Component({ comparison: {
    currentLabel: comparison.current_label, proposedLabel: comparison.proposed_label, changedLabel: comparison.changed_label,
    fields: comparison.fields.map((field) => ({
      id: field.id, label: field.label, currentValue: field.current_value, proposedValue: field.proposed_value,
      layout: field.layout, changed: field.changed,
    })),
  } });
}
function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return value?.props ? [value, ...nodes(value.props.children)] : [];
}
function text(value: any): string {
  if (Array.isArray(value)) return value.map(text).join("");
  return value?.props ? text(value.props.children) : typeof value === "string" ? value : "";
}
test("renderer shows entire descriptions with whole-field emphasis and accessible old/new labels", () => {
  const tree = render(419, 1);
  for (const field of comparison.fields) {
    assert.ok(text(tree).includes(field.current_value));
    assert.ok(text(tree).includes(field.proposed_value));
  }
  const changedViews = nodes(tree).filter((node) =>
    JSON.stringify(node.props.style ?? null).includes("#DBE4D0"));
  assert.equal(changedViews.length, 1);
  assert.ok(text(changedViews[0]).includes(comparison.fields[1].proposed_value));
  const accessible = nodes(tree).filter((node) => node.props.accessible);
  assert.equal(accessible.length, 2);
  assert.match(accessible[1].props.accessibilityLabel, /Descripción. Con cambios. Actual:/);
  assert.ok(accessible[1].props.accessibilityLabel.includes(comparison.fields[1].proposed_value));
  assert.ok(nodes(tree).every((node) => node.props.numberOfLines === undefined));
});
test("narrow screens and enlarged text use labeled stacked values without truncating strings", () => {
  for (const [width, scale] of [[320, 1], [419, 1.3]]) {
    const tree = render(width, scale);
    const total = nodes(tree).find((node) => node.props.accessibilityLabel?.startsWith("Total de productos"));
    assert.ok(total);
    assert.ok(text(total).includes("Actual"));
    assert.ok(text(total).includes("Propuesta"));
    assert.ok(text(total).includes("₡130,000.00"));
  }
});
