import {
  formatConversationOfferTotal,
  formatOfferAmount,
} from "./conversationOfferPrice";

function displayText(value: unknown) {
  return typeof value === "string" && value.trim() && value.trim() !== "-"
    ? value.trim()
    : undefined;
}

export function buildConversationOfferSummary(
  context: Record<string, unknown>,
) {
  const fulfillment = Array.isArray(context.offer_fulfillment_details)
    ? context.offer_fulfillment_details
    : [];
  const rows: { label: string; value: string }[] = [];
  const quantity = context.offer_quantity_offered;
  if (
    typeof quantity === "number" &&
    Number.isFinite(quantity) &&
    quantity > 0
  ) {
    rows.push({ label: "Cantidad ofrecida", value: String(quantity) });
  }
  const unitPrice = formatOfferAmount(
    context.offer_price_amount,
    context.offer_currency_code,
  );
  if (context.offer_price_basis === "UNIT" && unitPrice) {
    rows.push({ label: "Precio por unidad", value: unitPrice });
  }
  const total = formatConversationOfferTotal(context);
  if (total) rows.push({ label: "Total de productos", value: total });

  const options = Array.isArray(context.fulfillment_options)
    ? context.fulfillment_options
    : [];
  for (const raw of options) {
    if (!raw || typeof raw !== "object") continue;
    const option = raw as Record<string, unknown>;
    const label = displayText(option.label);
    if (!label) continue;
    const selected =
      context.selected_fulfillment_catalog_id != null &&
      (option.catalog_id ?? option.value) ===
        context.selected_fulfillment_catalog_id;
    const details = [option.fee_label, option.timing_label, option.total_label]
      .map(displayText)
      .filter(Boolean);
    const catalogId = option.catalog_id ?? option.value;
    const stored = fulfillment.find(
      (value) =>
        value && typeof value === "object" && value.catalog_id === catalogId,
    );
    const delivery = stored?.method_kind === "shipping" ? stored : null;
    const pickup = stored?.method_kind === "pickup" ? stored : null;
    if (delivery) {
      const { shipping_price: cost, shipping_max_days: days } = delivery;
      if (
        !displayText(option.fee_label) &&
        typeof cost === "number" &&
        Number.isFinite(cost)
      ) {
        details.push(
          `Costo de envío: ${formatOfferAmount(cost, context.offer_currency_code)}`,
        );
      }
      if (
        !displayText(option.timing_label) &&
        typeof days === "number" &&
        Number.isFinite(days)
      ) {
        details.push(`Entrega: hasta ${days} día(s) desde el envío.`);
      }
    }
    if (
      pickup &&
      !displayText(option.timing_label) &&
      typeof pickup.pickup_after_days === "number" &&
      Number.isFinite(pickup.pickup_after_days)
    ) {
      details.push(
        `Retiro: ${pickup.pickup_after_days} día(s) desde la confirmación del vendedor.`,
      );
    }
    rows.push({
      label: selected ? `${label} · Seleccionado` : label,
      value: details.join("\n") || label,
    });
  }
  if (options.length === 0) {
    const delivery = displayText(context.delivery_type);
    if (delivery) rows.push({ label: "Entrega", value: delivery });
  }

  return {
    description: displayText(context.offer_description),
    descriptionPlacement: "afterRows" as const,
    rows,
  };
}
