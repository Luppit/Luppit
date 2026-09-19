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
