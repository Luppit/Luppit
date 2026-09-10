import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  buildPurchaseRequestSummaryRows,
  humanizeAttributeLabel,
} from "../src/utils/purchaseRequestSummary.ts";

test("the Goodyear review shows one brand and preserves the other rows", () => {
  assert.deepEqual(buildPurchaseRequestSummaryRows({
    titulo: "Llanta Goodyear 255/60 R14, 1 unidad",
    categoria: "Llantas",
    marca: ["Goodyear"],
    atributos: {
      marca: ["Goodyear"],
      medida: "255/60 R14",
      cantidad: 1,
      tipo_producto: "llanta",
    },
  }), [
    { label: "Categoría", value: "Llantas" },
    { label: "Marca", value: "Goodyear" },
    { label: "Medida", value: "255/60 R14" },
    { label: "Cantidad", value: "1" },
    { label: "Tipo producto", value: "llanta" },
  ]);
});

test("supported attribute aliases share one row for scalar and array values", () => {
  assert.deepEqual(buildPurchaseRequestSummaryRows({
    titulo: null,
    categoria: null,
    marca: ["Goodyear"],
    atributos: {
      brand: "Goodyear",
      marca: ["Goodyear", "Michelin", "Goodyear"],
      modelo: "Eagle",
      model: ["Eagle"],
      anio: 2026,
      year: "2026",
      año: [2026],
      quantity: 1,
      cantidad: ["1"],
    },
  }), [
    { label: "Marca", value: "Goodyear, Michelin" },
    { label: "Modelo", value: "Eagle" },
    { label: "Año", value: "2026" },
    { label: "Cantidad", value: "1" },
  ]);
});

test("arbitrary field names deduplicate across case, separators, and accents", () => {
  assert.deepEqual(buildPurchaseRequestSummaryRows({
    titulo: null,
    categoria: "Llantas",
    marca: [],
    atributos: {
      " Categoría ": "Llantas",
      "tono_color": "Rojo",
      "TONO-COLOR": ["Rojo"],
      " tono   color ": "Rojo",
      " Marca ": "Goodyear",
      BRAND: ["Goodyear"],
      "diámetro_externo": "60 cm",
      "DIAMETRO-EXTERNO": "60 cm",
      compatibilidad_iPhone: "15",
    },
  }), [
    { label: "Categoría", value: "Llantas" },
    { label: "Marca", value: "Goodyear" },
    { label: "Tono color", value: "Rojo" },
    { label: "Diámetro externo", value: "60 cm" },
    { label: "Compatibilidad iPhone", value: "15" },
  ]);
});

test("distinct values under equivalent attributes remain visible in one row", () => {
  assert.deepEqual(buildPurchaseRequestSummaryRows({
    titulo: null,
    categoria: null,
    marca: [],
    atributos: {
      marca: ["Goodyear"],
      brand: ["Michelin", "Goodyear"],
      cantidad: 1,
      quantity: 2,
      modelo: "ABc",
      model: "abc",
    },
  }), [
    { label: "Marca", value: "Goodyear, Michelin" },
    { label: "Cantidad", value: "1, 2" },
    { label: "Modelo", value: "ABc, abc" },
  ]);
});

test("equal values belonging to different attributes remain separate", () => {
  assert.deepEqual(buildPurchaseRequestSummaryRows({
    titulo: null,
    categoria: null,
    marca: [],
    atributos: { cantidad: 1, anio: 1, ancho: 1, perfil: "1" },
  }), [
    { label: "Cantidad", value: "1" },
    { label: "Año", value: "1" },
    { label: "Ancho", value: "1" },
    { label: "Perfil", value: "1" },
  ]);
});

test("canonical attributes take precedence over top-level compatibility values", () => {
  assert.deepEqual(buildPurchaseRequestSummaryRows({
    titulo: null,
    categoria: "Llantas",
    marca: ["Old brand"],
    atributos: { marca: "Goodyear", medida: "255/60 R14" },
  }), [
    { label: "Categoría", value: "Llantas" },
    { label: "Marca", value: "Goodyear" },
    { label: "Medida", value: "255/60 R14" },
  ]);
});

test("standalone summary fields fill missing or empty attributes", () => {
  for (const marca of [undefined, null, " ", [], ["", null], {}]) {
    assert.deepEqual(buildPurchaseRequestSummaryRows({
      titulo: null,
      categoria: "Llantas",
      marca: [" Goodyear ", "Michelin", "Goodyear"],
      atributos: { categoria: " ", marca },
    }), [
      { label: "Categoría", value: "Llantas" },
      { label: "Marca", value: "Goodyear, Michelin" },
    ]);
  }
});

test("blank and unsupported values are omitted while zero and false remain visible", () => {
  assert.deepEqual(buildPurchaseRequestSummaryRows({
    titulo: null,
    categoria: " ",
    marca: [],
    atributos: {
      marca: [],
      medida: " ",
      modelo: null,
      anio: undefined,
      ancho: Number.NaN,
      perfil: Number.POSITIVE_INFINITY,
      objeto: { value: "ignored" },
      lista: [null, " "],
      " ": "ignored",
      cantidad: 0,
      instalado: false,
      entrega: true,
    },
  }), [
    { label: "Cantidad", value: "0" },
    { label: "Instalado", value: "No" },
    { label: "Entrega", value: "Sí" },
  ]);
  assert.deepEqual(buildPurchaseRequestSummaryRows(null), []);
});

test("building review rows does not mutate the draft summary", () => {
  const summary = Object.freeze({
    titulo: null,
    categoria: "Llantas",
    marca: ["Goodyear"],
    atributos: Object.freeze({
      marca: Object.freeze(["Goodyear", "Goodyear"]),
      brand: "Goodyear",
      quantity: 1,
    }),
  });
  const before = structuredClone(summary);
  buildPurchaseRequestSummaryRows(summary);
  assert.deepEqual(summary, before);
});

test("the buyer card uses canonical rows while preserving review and publish controls", () => {
  const source = readFileSync(new URL("../app/(chat)/chat.tsx", import.meta.url), "utf8");
  const cardSource = source.slice(
    source.indexOf("function PublishRequestCard("),
    source.indexOf("function EmptyRequestAssistantState(")
  );
  const { outputText } = ts.transpileModule(cardSource, { compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
  } });
  const render = runInNewContext(`${outputText}\nPublishRequestCard`, {
    React: { createElement: (type: string, props: object) => ({ type, props }) },
    AssistantReviewCard: "AssistantReviewCard",
    buildPurchaseRequestSummaryRows,
    humanizeAttributeLabel,
  });
  const onPublish = () => {};
  const onContinue = () => {};
  const { type, props } = render({
    summary: {
      titulo: "Llanta Goodyear",
      categoria: "Llantas",
      marca: ["Goodyear"],
      atributos: { marca: "Goodyear", brand: ["Goodyear"] },
    },
    description: "Descripción guardada",
    isReadyToPublish: false,
    missingFields: ["tipo_producto"],
    disabled: true,
    continueDisabled: true,
    loading: true,
    onPublish,
    onContinue,
  });
  assert.equal(type, "AssistantReviewCard");
  assert.deepEqual(props.rows, [
    { label: "Categoría", value: "Llantas" },
    { label: "Marca", value: "Goodyear" },
  ]);
  assert.equal(props.title, "Llanta Goodyear");
  assert.equal(props.description, "Descripción guardada");
  assert.equal(props.isComplete, false);
  assert.equal(props.primaryDisabled, true);
  assert.equal(props.primaryLoading, true);
  assert.equal(props.secondaryDisabled, true);
  assert.equal(props.onPrimaryPress, onPublish);
  assert.equal(props.onSecondaryPress, onContinue);
  assert.equal(props.notices[0].text, "Falta completar: Tipo producto.");
});
