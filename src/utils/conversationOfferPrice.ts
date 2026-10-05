function displayText(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text !== "-" ? text : null;
}

export function formatOfferAmount(amount: unknown, rawCurrencyCode: unknown) {
  const currencyCode = displayText(rawCurrencyCode)?.toUpperCase();
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;

  const prefix = currencyCode === "USD" ? "$" : "₡";
  return `${prefix}${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatConversationOfferPrice(context: Record<string, unknown>) {
  const summary = displayText(context.offer_price_summary) ??
    displayText(context.offer_price);
  if (summary) return summary;

  if (context.pricing_version === 2) {
    const rows = buildOfferPricingRows(context);
    const subtotal = formatOfferAmount(context.offer_subtotal, context.offer_currency_code);
    return [...rows.map((row) => `${row.label}: ${row.value}`),
      subtotal ? `Subtotal de la oferta: ${subtotal}` : "Subtotal pendiente",
    ].join("\n");
  }

  const amount = formatOfferAmount(context.offer_price_amount, context.offer_currency_code);
  if (!amount) return null;
  if (context.offer_price_basis === "TOTAL") return `Total de productos: ${amount}`;
  if (context.offer_price_basis !== "UNIT") return amount;

  const quantity = context.offer_quantity_offered;
  const subtotal = formatOfferAmount(context.offer_product_subtotal, context.offer_currency_code);
  return [
    `${amount} por unidad`,
    typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
      ? `Cantidad: ${quantity}`
      : null,
    subtotal ? `Total de productos: ${subtotal}` : null,
  ].filter(Boolean).join(" · ");
}

export function formatConversationOfferTotal(context: Record<string, unknown>) {
  const fullSubtotal = formatOfferAmount(context.offer_subtotal, context.offer_currency_code);
  if (fullSubtotal) return fullSubtotal;
  if (context.pricing_version === 2 || (Array.isArray(context.offer_components) && context.offer_components.length > 0)) return null;
  const subtotal = formatOfferAmount(context.offer_product_subtotal, context.offer_currency_code);
  if (subtotal) return subtotal;

  const price = context.offer_price_amount;
  if (context.offer_price_basis === "UNIT") {
    const quantity = context.offer_quantity_offered;
    return typeof price === "number" && typeof quantity === "number" && quantity > 0
      ? formatOfferAmount(price * quantity, context.offer_currency_code)
      : null;
  }
  return formatOfferAmount(price, context.offer_currency_code) ?? displayText(context.offer_price);
}

export function normalizePurchaseOfferPricing(value: Record<string, unknown>) {
  return {
    offer_subtotal: typeof value.offer_subtotal === "number" && Number.isFinite(value.offer_subtotal) ? value.offer_subtotal : null,
    offer_components: normalizeOfferComponents(value.offer_components),
    offer_unit_label: displayText(value.offer_unit_label),
    pricing_version: value.pricing_version === 2 ? 2 : 1,
    price_basis: value.price_basis === "UNIT" || value.price_basis === "TOTAL"
      ? value.price_basis
      : null,
    quantity_offered:
      typeof value.quantity_offered === "number" &&
        Number.isFinite(value.quantity_offered) && value.quantity_offered > 0
        ? value.quantity_offered
        : null,
    offer_product_subtotal:
      typeof value.offer_product_subtotal === "number" &&
        Number.isFinite(value.offer_product_subtotal) && value.offer_product_subtotal >= 0
        ? value.offer_product_subtotal
        : null,
    offer_price_summary: displayText(value.offer_price_summary),
  };
}

export type OfferPricingComponent = {
  id: string;
  description: string;
  charge_mode: "EXTRA" | "INCLUDED" | "UNRESOLVED";
  amount: number | null;
  basis: "UNIT" | "TOTAL" | null;
  quantity: number | null;
  unit_label: string | null;
  subtotal: number | null;
};

export function normalizeOfferComponents(value: unknown): OfferPricingComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string") return [];
    const numeric = (n: unknown) => typeof n === "number" && Number.isFinite(n) ? n : null;
    return [{ id: raw.id, description: displayText(raw.description) ?? "Concepto pendiente",
      charge_mode: raw.charge_mode === "EXTRA" || raw.charge_mode === "INCLUDED" ? raw.charge_mode : "UNRESOLVED",
      amount: numeric(raw.amount), basis: raw.basis === "UNIT" || raw.basis === "TOTAL" ? raw.basis : null,
      quantity: numeric(raw.quantity), unit_label: displayText(raw.unit_label), subtotal: numeric(raw.subtotal) } as OfferPricingComponent];
  });
}

export function buildOfferPricingRows(context: Record<string, unknown>) {
  const components = normalizeOfferComponents(context.offer_components);
  if (!components.length) return [];
  const principal = formatOfferAmount(context.offer_price_amount, context.offer_currency_code);
  const quantity = context.offer_quantity_offered;
  const unit = displayText(context.offer_unit_label) ?? "unidad";
  const rows = [{ label: "Concepto principal", value: [principal,
    context.offer_price_basis === "UNIT" ? `por ${unit} × ${quantity ?? "cantidad pendiente"}`
      : context.offer_price_basis === "TOTAL" ? "por el conjunto" : "Alcance pendiente",
    formatOfferAmount(context.offer_product_subtotal, context.offer_currency_code),
  ].filter(Boolean).join(" · ") }];
  for (const c of components) {
    const amount = formatOfferAmount(c.amount, context.offer_currency_code);
    rows.push({ label: c.description, value: c.charge_mode === "INCLUDED" ? "Incluido"
      : c.charge_mode === "UNRESOLVED" || !amount ? "Pendiente"
      : [amount, c.basis === "UNIT" ? `por ${c.unit_label ?? "unidad pendiente"} × ${c.quantity ?? "cantidad pendiente"}`
        : c.basis === "TOTAL" ? "por el conjunto" : "Alcance pendiente"].join(" · ") });
  }
  return rows;
}

export function buildOfferPriceRows(context: Record<string, unknown>) {
  const amount = formatOfferAmount(context.offer_price_amount, context.offer_currency_code);
  if (!amount || !["UNIT", "TOTAL"].includes(String(context.offer_price_basis))) return [];
  const unit = displayText(context.offer_unit_label) ?? "unidad";
  const quantity = context.offer_quantity_offered;
  const rows: { label: string; detail?: string; value?: string }[] = [{
    label: "Concepto principal",
    detail: context.offer_price_basis === "UNIT"
      ? `${typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0 ? `${quantity} × ` : ""}${amount} por ${unit}`
      : `Por el conjunto${typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0 ? ` · ${quantity}${displayText(context.offer_unit_label) ? " × " : " "}${displayText(context.offer_unit_label) ?? "unidades"}` : ""}`,
    value: context.offer_price_basis === "UNIT"
      ? formatOfferAmount(context.offer_product_subtotal, context.offer_currency_code) ?? undefined : amount,
  }];
  for (const component of normalizeOfferComponents(context.offer_components)) {
    const componentAmount = formatOfferAmount(component.amount, context.offer_currency_code);
    rows.push({
      label: component.description,
      detail: component.charge_mode === "INCLUDED" ? undefined
        : component.basis === "UNIT"
          ? `${componentAmount ?? "Importe pendiente"} por ${component.unit_label ?? "unidad pendiente"} × ${component.quantity ?? "cantidad pendiente"}`
          : component.basis === "TOTAL" ? "Por el conjunto" : "Alcance pendiente",
      value: component.charge_mode === "INCLUDED" ? "Incluido"
        : component.charge_mode === "UNRESOLVED" ? "Pendiente"
        : component.basis === "UNIT" ? formatOfferAmount(component.subtotal, context.offer_currency_code) ?? undefined
          : componentAmount ?? "Pendiente",
    });
  }
  return rows;
}

export function formatOfferTotalLabel(value: string) {
  const money = /^Total:\s*([A-Z]{3})\s+([0-9]+(?:\.[0-9]+)?)$/.exec(value.trim());
  return money ? formatOfferAmount(Number(money[2]), money[1])! : value.replace(/^Total:\s*/, "");
}
