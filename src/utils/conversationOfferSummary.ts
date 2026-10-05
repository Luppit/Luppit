import {
  formatConversationOfferTotal,
  formatOfferAmount,
  buildOfferPricingRows,
  normalizeOfferComponents,
} from "./conversationOfferPrice";

import type { PopupOfferAcceptance, PopupSummaryInput } from "../services/popup.service";

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
  const pricingRows = buildOfferPricingRows(context);
  const hasComponents = pricingRows.length > 0 || context.pricing_version === 2;
  const unit = displayText(context.offer_unit_label);
  const quantity = context.offer_quantity_offered;
  const quantityLabel = typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
    ? `${quantity}${unit ? " × " : " "}${unit ?? "unidades"}` : undefined;
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
    rows.push({ label: `Precio por ${displayText(context.offer_unit_label) ?? "unidad"}`, value: unitPrice });
  }
  const total = formatConversationOfferTotal(context);
  if (total) rows.push({ label: hasComponents ? "Subtotal de la oferta" : "Total de productos", value: total });

  const options = Array.isArray(context.fulfillment_options)
    ? context.fulfillment_options
    : [];
  const deliveryOptions: string[] = [];
  const deliveryRows: {
    label: string;
    detail?: string;
    icon?: "truck" | "store";
  }[] = [];
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
    const optionLabel = selected ? `${label} · Seleccionado` : label;
    deliveryRows.push({
      label: optionLabel,
      detail: details.join(" · ") || undefined,
      icon: stored?.method_kind === "shipping" ? "truck"
        : stored?.method_kind === "pickup" ? "store" : undefined,
    });
    deliveryOptions.push(
      [`• ${optionLabel}`, ...details.map((detail) => `  ${detail}`)].join("\n"),
    );
  }
  if (deliveryOptions.length > 0) {
    rows.push({ label: "Opciones de entrega", value: deliveryOptions.join("\n") });
  }
  if (options.length === 0) {
    const delivery = displayText(context.delivery_type);
    if (delivery) {
      rows.push({ label: "Entrega", value: delivery });
      deliveryRows.push({ label: "Entrega", detail: delivery });
    }
  }

  return {
    description: displayText(context.offer_description),
    descriptionPlacement: "afterRows" as const,
    rows,
    offerVisual: {
      title: displayText(context.offer_name) ?? displayText(context.request_title) ?? "Oferta",
      quantity: quantityLabel,
      price: total
        ? {
            label: hasComponents ? "Subtotal de la oferta" : context.offer_price_basis === "UNIT" ? "Total de productos" : "Precio total",
            value: total,
            detail: context.offer_price_basis === "UNIT" && unitPrice
              ? `${unitPrice} por ${unit ?? "unidad"}${quantityLabel ? ` · ${quantityLabel}` : ""}`
              : undefined,
          }
        : unitPrice && context.offer_price_basis === "UNIT"
          ? { label: "Precio por unidad", value: unitPrice }
          : undefined,
      rows: pricingRows,
      deliveryRows,
    },
  };
}


export function buildOfferAcceptancePresentation(
  context: Record<string, unknown>,
  priceField: { label: string; value: string },
): PopupOfferAcceptance {
  const amount = formatOfferAmount(context.offer_price_amount, context.offer_currency_code);
  const subtotal = formatConversationOfferTotal(context);
  const principalSubtotal = formatOfferAmount(context.offer_product_subtotal, context.offer_currency_code);
  const unit = displayText(context.offer_unit_label) ?? "unidad";
  const quantity = context.offer_quantity_offered;
  const components = normalizeOfferComponents(context.offer_components);
  if (!amount || !subtotal || !["UNIT", "TOTAL"].includes(String(context.offer_price_basis))) {
    return { rows: [{ label: priceField.label, detail: priceField.value }], descriptionLabel: "Descripción" };
  }

  const rows: PopupOfferAcceptance["rows"] = [{
    label: "Concepto principal",
    detail: context.offer_price_basis === "UNIT"
      ? `${typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0 ? `${quantity} × ` : ""}${amount} por ${unit}`
      : "Por el conjunto",
    value: context.offer_price_basis === "UNIT" ? principalSubtotal ?? undefined : amount,
  }];
  for (const component of components) {
    const componentAmount = formatOfferAmount(component.amount, context.offer_currency_code);
    rows.push({
      label: component.description,
      detail: component.charge_mode === "INCLUDED" ? undefined
        : component.basis === "UNIT"
          ? `${componentAmount ?? "Importe pendiente"} por ${component.unit_label ?? "unidad pendiente"} × ${component.quantity ?? "cantidad pendiente"}`
          : component.basis === "TOTAL" ? "Por el conjunto" : "Alcance pendiente",
      value: component.charge_mode === "INCLUDED" ? "Incluido"
        : component.charge_mode === "UNRESOLVED" ? "Pendiente"
        : component.basis === "UNIT" ? undefined : componentAmount ?? "Pendiente",
    });
  }
  return { rows, subtotal: { label: "Subtotal de la oferta", value: subtotal }, descriptionLabel: "Descripción" };
}

export function getOfferAcceptanceTotal(
  presentation: PopupOfferAcceptance,
  inputs: PopupSummaryInput[] | undefined,
  values: Record<string, string>,
) {
  const input = inputs?.find((candidate) => candidate.id === presentation.fulfillmentInputId);
  const option = input?.options?.find((candidate) => candidate.value === values[input.id] && !candidate.disabled);
  if (!option) return presentation.subtotal;
  if (!option.totalLabel) return { label: "Total a pagar", value: "Por confirmar" };
  const money = /^Total:\s*([A-Z]{3})\s+([0-9]+(?:\.[0-9]+)?)$/.exec(option.totalLabel.trim());
  return {
    label: "Total a pagar",
    value: money ? formatOfferAmount(Number(money[2]), money[1])! : option.totalLabel,
  };
}
