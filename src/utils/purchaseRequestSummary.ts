import type { PurchaseRequestAssistantSummary } from "../services/purchase.request.assistant.service";

const ATTRIBUTE_ALIASES = new Map([
  ["brand", "marca"],
  ["model", "modelo"],
  ["year", "anio"],
  ["ano", "anio"],
  ["quantity", "cantidad"],
]);

const ATTRIBUTE_LABELS = new Map([
  ["categoria", "Categoría"],
  ["marca", "Marca"],
  ["modelo", "Modelo"],
  ["anio", "Año"],
  ["cantidad", "Cantidad"],
]);

export function humanizeAttributeLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function attributeKey(value: string) {
  const normalized = humanizeAttributeLabel(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ATTRIBUTE_ALIASES.get(normalized) ?? normalized;
}

function summaryValues(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (typeof value === "number" && Number.isFinite(value)) return [String(value)];
  if (typeof value === "boolean") return [value ? "Sí" : "No"];
  if (Array.isArray(value)) return value.flatMap(summaryValues);
  return [];
}

export function buildPurchaseRequestSummaryRows(
  summary: PurchaseRequestAssistantSummary | null
) {
  const attributes = new Map<string, { label: string; values: Set<string> }>();

  function addAttribute(name: string, value: unknown) {
    const key = attributeKey(name);
    const values = summaryValues(value);
    if (!key || values.length === 0) return;

    const label = ATTRIBUTE_LABELS.get(key) ?? humanizeAttributeLabel(name);
    const attribute = attributes.get(key) ?? { label, values: new Set<string>() };
    for (const entry of values) attribute.values.add(entry);
    attributes.set(key, attribute);
  }

  for (const [name, value] of Object.entries(summary?.atributos ?? {})) {
    addAttribute(name, value);
  }

  if (!attributes.has("categoria")) addAttribute("categoria", summary?.categoria);
  if (!attributes.has("marca")) addAttribute("marca", summary?.marca);

  const orderedKeys = new Set(["categoria", "marca", ...attributes.keys()]);
  return [...orderedKeys].flatMap((key) => {
    const attribute = attributes.get(key);
    return attribute
      ? [{ label: attribute.label, value: [...attribute.values].join(", ") }]
      : [];
  });
}
