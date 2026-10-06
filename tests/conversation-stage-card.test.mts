import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Node = { type: string; props: any };
const react = { createElement: (type: string, props: any, ...children: any[]) => ({
  type, props: { ...props, children },
}), useState: (value: unknown) => [value, () => {}] };
function compile(source: string, modules: Record<string, unknown>) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  });
  const exports: any = {};
  runInNewContext(outputText, { exports, require: (name: string) => modules[name] ?? {} });
  return exports;
}
const actionSource = readFileSync(new URL(
  "../src/components/conversation/useConversationActions.ts", import.meta.url), "utf8");
// Use the existing mapper, with the same installed icon names available to these fixtures.
const mapper = compile("const lucideIcons = {check: 1, 'circle-x': 1, 'file-text': 1};\n" + actionSource.slice(
  actionSource.indexOf("export function normalizeOptionalIcon("), actionSource.indexOf("function createClientRequestId(")), {});
const theme = { spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }, typography: { body: { lineHeight: 22 } },
  glass: { radius: { surface: 24 } },
  colors: { error: "danger", primary: "primary", success: "success", border: "border" } };
const render = compile(readFileSync(new URL(
  "../src/components/conversation/ConversationStageCard.tsx", import.meta.url), "utf8"), {
  react: { ...react, default: react },
  "react-native": { View: "View", ScrollView: "ScrollView", StyleSheet: { hairlineWidth: 1 }, useWindowDimensions: () => ({ width: 390, fontScale: 1 }) },
  "@/src/themes": { useTheme: () => theme },
  "@/src/components/Text": { Text: "Text" },
  "@/src/components/Icon": { Icon: "Icon" },
  "@/src/components/glass/GlassSurface": { default: "GlassSurface" },
  "@/src/components/surface/styles": { createRoundedSurfaceStyle: () => ({}) },
  "./ConversationActionButtons": { default: "Actions" },
  "./useConversationActions": mapper,
}).default;
function nodes(tree: any): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props.children)];
}
function text(tree: any): string[] {
  if (Array.isArray(tree)) return tree.flatMap(text);
  if (typeof tree === "string") return [tree];
  return tree && typeof tree === "object" ? text(tree.props.children) : [];
}
const primary = { id: "review", label: "Revisar condiciones", code: "review", ui_slot: "TOP",
  style_code: "primary", icon: "file-text", helper_text: "Texto del servidor", confirmation: { title: "Confirmación original" } };
const secondary = { ...primary, id: "reject", label: "Rechazar", ui_slot: "AUX", style_code: "danger", icon: "circle-x" };
const menu = { ...primary, id: "report", label: "Reportar", ui_slot: "MENU" };
const view = {
  actions: [secondary, primary, menu],
  slots: [{ code: "deadline", section_label: "Fecha límite del retiro", formatted_due_at: "8 oct 2026 · 7:20 p. m.",
    availability: { label: "Disponible desde", formatted_at: "7 oct 2026 · 10:00 a. m." },
    deadline_message: "La compra seguirá abierta.", is_overdue: false }],
  presentation: { locked: false, request_brief: { label: "Solicitud", description: "Descripción original de la solicitud" },
    card: { label: "Estado actual", title: "Título original", message: "Explicación original", icon: "check", tone: "normal",
      comparison: { current_label: "Condición vigente", current_value: "2 días", proposed_label: "Propuesta", proposed_value: "3 días" },
      supporting: { title: "Retiro en pausa", message: "Mensaje original del bloqueo" } }, rating_message: "Mensaje de calificación original" },
};

test("expanded presentation retains all existing DB content, deadlines and action order", () => {
  const tree = render({ view, disabled: false, onPress: () => {}, reserveCollapseControl: true });
  assert.deepEqual(text(tree), ["Solicitud", "Descripción original de la solicitud", "Estado actual", "Título original",
    "Explicación original", "Condición vigente", "2 días", "Propuesta", "3 días", "Retiro en pausa",
    "Mensaje original del bloqueo", "Disponible desde", "7 oct 2026 · 10:00 a. m.", "Fecha límite del retiro",
    "8 oct 2026 · 7:20 p. m.", "La compra seguirá abierta.", "Mensaje de calificación original"]);
  const buttons = nodes(tree).find(node => node.type === "Actions")!.props.buttons;
  assert.deepEqual(Array.from(buttons, (button: any) => button.id), [secondary.id, primary.id]);
  assert.equal(buttons[1].label, primary.label);
  assert.equal(buttons[1].helperText, primary.helper_text);
});

test("compact action prefers the unchanged positive server action even after rejection and retains the pause label", () => {
  let selected: unknown;
  const tree = render({ view, disabled: false, compact: true, onPress: (action: unknown) => { selected = action; } });
  const actions = nodes(tree).find(node => node.type === "Actions")!.props;
  assert.equal(actions.buttons.length, 1);
  assert.equal(actions.buttons[0].id, primary.id);
  assert.deepEqual(text(tree), ["Retiro en pausa"]);
  actions.onPress(primary.id);
  assert.equal(selected, primary);
  assert.equal((selected as any).confirmation, primary.confirmation);
});

test("compact selection uses style metadata across offer, delivery and review actions", () => {
  for (const label of ["Aceptar", "Ofertar", "Confirmar disponibilidad", "Validar código", "Sí lo recibí", "Revisar cambios"]) {
    for (const style_code of ["primary", "success", "positive", "confirm"]) {
      const advance = { ...primary, label, style_code };
      const tree = render({ view: { ...view, actions: [secondary, advance, menu] },
        compact: true, disabled: false, onPress: () => {} });
      const buttons = nodes(tree).find(node => node.type === "Actions")!.props.buttons;
      assert.equal(buttons.length, 1);
      assert.equal(buttons[0].label, label);
    }
  }
});

test("compact selection preserves a neutral action when there is no primary action", () => {
  for (const label of ["Reenviar código", "Califica al vendedor", "Ver cambios"]) {
    const neutral = { ...primary, label, style_code: "black" };
    let selected: unknown;
    const tree = render({ view: { ...view, actions: [secondary, neutral, menu] },
      compact: true, disabled: false, onPress: (action: unknown) => { selected = action; } });
    const actions = nodes(tree).find(node => node.type === "Actions")!.props;
    assert.equal(actions.buttons[0].label, label);
    actions.onPress(neutral.id);
    assert.equal(selected, neutral);
  }
});

test("destructive-only compact states remain passive while expansion retains all actions", () => {
  for (const style_code of ["error", "danger", "destructive", "reject", "cancel", "primary-error"]) {
    const destructive = { ...secondary, style_code };
    const state = { ...view, actions: [destructive, menu] };
    const tree = render({ view: state, compact: true, disabled: false, onPress: () => assert.fail("destructive action executed") });
    assert.equal(nodes(tree).some(node => node.type === "Actions"), false);
    assert.deepEqual(text(tree), ["Título original", "Retiro en pausa"]);
    const expanded = render({ view: state, disabled: false, onPress: () => {} });
    assert.equal(nodes(expanded).find(node => node.type === "Actions")!.props.buttons[0].id, destructive.id);
  }
});

test("compact deadlines use the original server label and preformatted date", () => {
  const tree = render({ view: { ...view, presentation: { ...view.presentation,
    card: { ...view.presentation.card, supporting: undefined } } }, compact: true, disabled: false, onPress: () => {} });
  assert.deepEqual(text(tree), ["Fecha límite del retiro: 8 oct 2026 · 7:20 p. m."]);
});

test("bounded compact supporting text remains complete and scrollable", () => {
  const tree = render({ view, compact: true, compactMaxHeight: 180, disabled: false, onPress: () => {} });
  assert.deepEqual(text(tree), ["Retiro en pausa"]);
  const body = nodes(tree).find(node => node.type === "ScrollView")!;
  assert.equal(body.props.style.maxHeight, 98);
  assert.equal(body.props.nestedScrollEnabled, true);
});

test("locked presentation exposes only the original status and pause, with no executable compact action", () => {
  const tree = render({ view: { ...view, presentation: { ...view.presentation, locked: true } },
    compact: true, disabled: false, onPress: () => assert.fail("locked action executed") });
  assert.equal(nodes(tree).some(node => node.type === "Actions"), false);
  assert.deepEqual(text(tree), ["Título original", "Retiro en pausa"]);
});

test("passive wait and completed rating copy stay server-owned without invented compact actions", () => {
  const tree = render({ view: { ...view, actions: [], slots: [], presentation: { ...view.presentation,
    card: { ...view.presentation.card, supporting: undefined } } }, compact: true, disabled: false, onPress: () => {} });
  assert.equal(nodes(tree).some(node => node.type === "Actions"), false);
  assert.deepEqual(text(tree), ["Título original", "Mensaje de calificación original"]);
});
