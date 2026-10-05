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
    "@/src/components/Icon": { Icon: "Icon" },
    "react-native": { View: "View", Pressable: "Pressable",
      StyleSheet: { create: (styles: any) => styles, hairlineWidth: 1 } },
  });
}
function render(fields: any[] = comparison.fields, showFull = false, onShowFull = () => {}, differenceLabel?: string) {
  const Component = renderer().default;
  return Component({ comparison: {
    currentLabel: comparison.current_label, proposedLabel: comparison.proposed_label, changedLabel: comparison.changed_label, differenceLabel,
    fields: fields.map((field) => ({
      id: field.id, label: field.label, currentValue: field.current_value, proposedValue: field.proposed_value,
      layout: field.layout, changed: field.changed, changeLabel: field.change_label, compactVisible: field.compact_visible,
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
test("compact review gives amount context and discloses the complete description without fragment diffs", () => {
  let opened = 0;
  const tree = render(comparison.fields, false, () => { opened += 1; });
  assert.ok(!text(tree).includes("Además ofrecemos un kit."));
  assert.ok(!text(tree).includes("Original\ncompleto."));
  assert.ok(text(tree).includes("₡130,000.00"));
  assert.ok(text(tree).includes("Total de productos"));
  const links = nodes(tree).filter((node) => node.type === "Pressable");
  assert.deepEqual(links.map((node) => node.props.accessibilityLabel), ["Ver descripción completa", "Ver ofertas completas"]);
  links[0].props.onPress();
  assert.equal(opened, 1);
});
test("complete terms show every exact value from both offers without truncation", () => {
  const tree = render(comparison.fields, true);
  for (const field of comparison.fields) {
    assert.ok(text(tree).includes(field.current_value));
    assert.ok(text(tree).includes(field.proposed_value));
  }
  assert.ok(text(tree).includes("Actual"));
  assert.ok(text(tree).includes("Propuesta"));
  assert.equal(nodes(tree).filter((node) => node.type === "Pressable").length, 0);
  assert.ok(nodes(tree).every((node) => node.props.numberOfLines === undefined && node.props.maxLines === undefined));
});
test("server delta stays neutral and duplicate price suppression comes from metadata", () => {
  const fields = [
    { id: "total", label: "Subtotal de la oferta", current_value: "₡130,000",
      proposed_value: "₡140,000", changed: true, layout: "inline" },
    { id: "price", label: "Precio indicado", current_value: "₡130,000 por el conjunto",
      proposed_value: "₡140,000 por el conjunto", changed: true, layout: "inline", compact_visible: false },
    { id: "photos", label: "Fotos", current_value: "1 foto", proposed_value: "1 foto", changed: true,
      change_label: "Fotos actualizadas", layout: "inline" },
  ];
  const tree = render(fields, false, () => {}, "Aumenta ₡10,000");
  assert.ok(text(tree).includes("₡140,000"));
  assert.ok(!text(tree).includes("Precio indicado"));
  assert.ok(text(tree).includes("Fotos actualizadas"));
  assert.equal(nodes(tree).find((node) => node.type === "Pressable")?.props.accessibilityLabel, "Ver fotos");
  const delta = nodes(tree).find((node) => node.type === "Text" && text(node) === "Aumenta ₡10,000");
  assert.equal(delta?.props.color, undefined);
  assert.ok(text(render(fields, true)).includes("Precio indicado"));
});
test("generic concept changes retain each server-provided description and scope", () => {
  const fields = [
    { id: "component:assembly", label: "Concepto complementario", current_value: "",
      proposed_value: "Montaje\n₡5,000 · por el conjunto", changed: true, layout: "stacked", change_label: "Concepto añadido" },
    { id: "component:labor", label: "Concepto complementario", current_value: "Instalación\n₡2,500 por hora × 3",
      proposed_value: "Instalación\n₡3,000 por hora × 3", changed: true, layout: "stacked", change_label: "Concepto modificado" },
    { id: "component:support", label: "Concepto complementario", current_value: "Soporte\nIncluido",
      proposed_value: "", changed: true, layout: "stacked", change_label: "Concepto eliminado" },
  ];
  const tree = render(fields);
  for (const field of fields) {
    assert.ok(text(tree).includes(field.change_label));
    assert.ok(text(tree).includes(field.current_value));
    assert.ok(text(tree).includes(field.proposed_value));
  }
});
test("comparison parser keeps optional DB copy and ignores malformed optional presentation hints", () => {
  const enriched = { ...comparison, difference_label: "Aumenta ₡10,000", fields: comparison.fields.map((field) => ({
    ...field, compact_visible: false, change_label: "Descripción actualizada",
  })) };
  assert.deepEqual(JSON.parse(JSON.stringify(parse({ ...confirmation, comparison: enriched }).comparison)), enriched);
  const parsed = parse({ ...confirmation, comparison: { ...enriched, difference_label: 10000,
    fields: [{ ...enriched.fields[0], compact_visible: "false", change_label: {} }] } }).comparison;
  assert.equal(parsed.difference_label, undefined);
  assert.equal(parsed.fields[0].compact_visible, undefined);
  assert.equal(parsed.fields[0].change_label, undefined);
});
const { hasMissingRequiredChoices } = load("../src/services/popup.service.ts", {});
test("required choices allow only explicit available selections and never disable the other review action", () => {
  const confirm = { requiredChoiceInputIds: ["delivery"] };
  const inputs = [{ id: "delivery", kind: "choice", is_required: true,
    options: [{ value: "shipping", disabled: false }, { value: "pickup", disabled: true }] }];
  for (const value of [undefined, "", "unknown", "pickup"]) {
    assert.equal(hasMissingRequiredChoices(confirm, inputs, { delivery: value }), true);
  }
  assert.equal(hasMissingRequiredChoices(confirm, inputs, { delivery: "shipping" }), false);
  assert.equal(hasMissingRequiredChoices({}, inputs, {}), false);
  assert.equal(hasMissingRequiredChoices(confirm, [], { delivery: "shipping" }), true);
});
