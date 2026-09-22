import { Icon } from "@/src/components/Icon";
import Button from "@/src/components/button/Button";
import LuppitChip from "@/src/components/chip/LuppitChip";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import { Text } from "@/src/components/Text";
import { LucideIconName } from "@/src/icons/lucide";
import { PurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { Theme, useTheme } from "@/src/themes";
import { formatConversationOfferPrice, formatConversationOfferTotal, formatOfferAmount } from "@/src/utils/conversationOfferPrice";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export type OfferCardTimelineItem = {
  code: string;
  label: string;
  icon: LucideIconName;
  reached_at?: string | null;
  reached_at_label?: string | null;
  pre_label?: string | null;
  detail?: string | null;
  style_code?: string | null;
  method_kind?: "shipping" | "pickup" | "both" | null;
  method_label?: string | null;
  accessibility_label?: string | null;
  is_completed: boolean;
  is_next: boolean;
};

type OfferCardProps = {
  offer: PurchaseOfferCardData;
  onConnect?: () => void;
  connectLabel?: string;
  onMenuPress?: () => void;
  timeline?: OfferCardTimelineItem[];
  timelineLoading?: boolean;
  timelineError?: string | null;
  onTimelineRetry?: () => void;
  timelineActions?: React.ReactNode;
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveTimelineColor(styleCode: string | null | undefined, t: Theme) {
  const normalized = normalize(styleCode);
  if (normalized.includes("error") || normalized.includes("danger")) {
    return t.colors.error;
  }
  if (normalized.includes("warning")) return t.colors.warning;
  if (normalized.includes("success") || normalized.includes("positive")) {
    return t.colors.success;
  }
  if (normalized.includes("primary")) return t.colors.primary;
  return t.colors.info;
}

export default function OfferCard({
  offer,
  onConnect,
  connectLabel = "Ver conversación",
  onMenuPress,
  timeline = [],
  timelineLoading = false,
  timelineError,
  onTimelineRetry,
  timelineActions,
}: OfferCardProps) {
  const t = useTheme();
  const s = useMemo(() => createOfferCardStyles(t), [t]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const businessName = offer.business_name?.trim() || "Negocio";
  const province = offer.business_province?.trim();
  const rating = offer.business_rating;
  const numRatings = offer.business_num_ratings;
  const formattedPrice = formatConversationOfferPrice({
    ...offer,
    offer_price_amount: offer.price,
    offer_price_basis: offer.price_basis,
    offer_quantity_offered: offer.quantity_offered,
  }) ?? "Precio no disponible";
  const unitPrice = offer.price_basis === "UNIT"
    ? formatOfferAmount(offer.price, offer.offer_currency_code)
    : null;
  const productTotal = offer.price_basis === "UNIT" || offer.price_basis === "TOTAL"
    ? formatConversationOfferTotal({
        ...offer,
        offer_price_amount: offer.price,
        offer_price_basis: offer.price_basis,
        offer_quantity_offered: offer.quantity_offered,
      })
    : null;
  const description = offer.description?.trim();
  const methodItem = timeline.find(
    (item) =>
      (item.method_kind === "shipping" || item.method_kind === "pickup") &&
      Boolean(item.method_label?.trim())
  );
  const methodLabel = methodItem?.method_label?.trim() ?? null;
  const methodIcon: LucideIconName =
    methodItem?.method_kind === "shipping" ? "truck" : "map-pin";
  const hasTimelineSection = timelineLoading || Boolean(timelineError) || timeline.length > 0 || Boolean(timelineActions);
  const ongoingItems = timeline.filter((step) => step.is_next || !step.is_completed);
  const summaryItems = ongoingItems.length > 0 ? ongoingItems : timeline.slice(0, 1);
  const historyItems = timeline.filter((step) => !summaryItems.includes(step));
  const showHistory = !timelineLoading && !timelineError && historyItems.length > 0;
  const historyCountLabel = `${historyItems.length} ${historyItems.length === 1 ? "evento" : "eventos"}`;

  const renderTimelineItem = (step: OfferCardTimelineItem, index: number, isSummary: boolean) => (
    <View
      key={`${step.code}-${index}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={step.accessibility_label?.trim() || [
        isSummary && index === 0 && methodLabel ? `Método de entrega: ${methodLabel}.` : null,
        step.pre_label,
        step.label,
        step.detail,
        step.reached_at_label?.trim() || step.reached_at,
      ].filter(Boolean).join(" ")}
      style={s.timelineRow}
    >
      {!isSummary ? (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={s.markerColumn}
        >
          <View style={s.marker}>
            <Icon name={step.icon} size={20} color={resolveTimelineColor(step.style_code, t)} />
          </View>
          {index < historyItems.length - 1 ? <View style={s.connector} /> : null}
        </View>
      ) : null}
      <View style={[s.timelineContent, isSummary ? s.summaryContent : null]}>
        {isSummary && index === 0 ? (
          <View style={s.timelineHeader}>
            {step.pre_label?.trim() ? (
              <Text variant="small" color="textMedium" maxFontSizeMultiplier={2} style={s.headerLabel}>
                {step.pre_label.trim()}
              </Text>
            ) : null}
            {methodLabel ? (
              <LuppitChip label={methodLabel} icon={methodIcon} bordered labelMaxLines={2}
                accessibilityLabel={`Método de entrega: ${methodLabel}`} style={s.methodChip} />
            ) : null}
          </View>
        ) : step.pre_label?.trim() ? (
          <Text variant="small" color="textMedium" maxFontSizeMultiplier={2} style={s.eyebrow}>
            {step.pre_label.trim()}
          </Text>
        ) : null}
        <Text variant="body" maxFontSizeMultiplier={2} style={isSummary ? s.summaryLabel : undefined}>
          {step.label}
        </Text>
        {step.detail?.trim() ? (
          <Text variant="body" color="textMedium" maxFontSizeMultiplier={2} style={s.timelineDetail}>
            {step.detail.trim()}
          </Text>
        ) : null}
        {step.reached_at_label?.trim() || step.reached_at?.trim() ? (
          <Text variant="small" color="textMedium" maxFontSizeMultiplier={2} style={s.timelineDate}>
            {step.reached_at_label?.trim() || step.reached_at?.trim()}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <MarketplaceCardFrame
      title={businessName}
      subtitle={province}
      fullText
      headerRight={onMenuPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Más opciones de la oferta"
          onPress={onMenuPress} style={s.menuButton}>
          <Icon name="ellipsis" size={22} color={t.colors.textDark} />
        </Pressable>
      ) : null}
      footerDivider={timelineLoading || Boolean(timelineError)}
      accessibilityLabel={`Oferta de ${businessName} por ${formattedPrice}`}
      body={
        <View style={s.body}>
          {description ? (
            <Text variant="body" color="textMedium">{description}</Text>
          ) : null}
          <View style={s.pricing}>
            {productTotal ? (
              <>
                {unitPrice ? (
                  <View style={s.priceRow}>
                    <Text variant="small" color="textMedium" style={s.priceLabel}>
                      {offer.quantity_offered != null
                        ? `${offer.quantity_offered} ${offer.quantity_offered === 1 ? "unidad" : "unidades"}`
                        : "Precio por unidad"}
                    </Text>
                    <Text variant="small" color="textMedium" style={s.priceValue}>{unitPrice} c/u</Text>
                  </View>
                ) : null}
                <View style={s.priceRow}>
                  <Text variant="small" color="textMedium" style={s.priceLabel}>Total de productos</Text>
                  <Text variant="body" style={[s.priceValue, s.price]}>{productTotal}</Text>
                </View>
              </>
            ) : (
              <Text variant="body" style={s.price}>{formattedPrice}</Text>
            )}
            {rating != null ? (
              <View style={s.ratingRow}>
                <Icon name="star" size={16} color={t.colors.accentYellow} />
                <Text variant="small">
                  {rating.toFixed(1)}{numRatings != null ? ` (${numRatings})` : ""}
                </Text>
              </View>
            ) : null}
          </View>

          {hasTimelineSection ? (
            <View style={s.timelineSection}>
              {timelineActions}
              {(timelineLoading || timelineError || summaryItems.length === 0) && methodLabel ? (
                <LuppitChip
                  label={methodLabel}
                  icon={methodIcon}
                  bordered
                  labelMaxLines={2}
                  accessibilityLabel={`Método de entrega: ${methodLabel}`}
                  style={s.methodChip}
                />
              ) : null}

              {timelineLoading ? (
                <View style={s.timelineState} accessibilityRole="text">
                  <Text variant="body" color="textMedium" maxFontSizeMultiplier={2}>
                    Cargando seguimiento…
                  </Text>
                </View>
              ) : timelineError ? (
                <View style={s.timelineError} accessibilityRole="alert">
                  <Text
                    variant="body"
                    color="textMedium"
                    maxFontSizeMultiplier={2}
                    style={s.timelineStateText}
                  >
                    {timelineError}
                  </Text>
                  {onTimelineRetry ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Reintentar cargar el seguimiento"
                      onPress={onTimelineRetry}
                      style={s.retryButton}
                    >
                      <Icon name="arrow-right" size={16} color={t.colors.primary} />
                      <Text variant="body" maxFontSizeMultiplier={2} style={s.retryLabel}>
                        Reintentar
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View style={s.timelineList}>
                  {summaryItems.map((step, index) => renderTimelineItem(step, index, true))}
                </View>
              )}
            </View>
          ) : null}
        </View>
      }
      footerLeft={
        <View style={s.footerContent}>
          <View style={s.footer}>
            <View style={s.connectButtonSlot}>
              <Button title={connectLabel} icon="message-circle" onPress={onConnect} />
            </View>
          </View>
          {showHistory ? (
            <View style={s.historySection}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Historial de la compra, ${historyCountLabel}`}
                accessibilityState={{ expanded: historyExpanded }}
                accessibilityHint="Muestra u oculta los eventos anteriores de la compra."
                onPress={() => setHistoryExpanded((expanded) => !expanded)}
                style={s.historyToggle}
              >
                <Icon name="clock" size={22} color={t.colors.textMedium} />
                <View style={s.historyHeading}>
                  <Text variant="body" maxFontSizeMultiplier={2} style={s.historyTitle}>
                    Historial de la compra
                  </Text>
                  <Text variant="small" color="textMedium" maxFontSizeMultiplier={2}>
                    {historyCountLabel}
                  </Text>
                </View>
                <Icon name={historyExpanded ? "chevron-down" : "chevron-right"} size={18} color={t.colors.textMedium} />
              </Pressable>
              {historyExpanded ? (
                <View style={s.timelineList}>
                  {historyItems.map((step, index) => renderTimelineItem(step, index, false))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      }
    />
  );
}

function createOfferCardStyles(t: Theme) {
  return StyleSheet.create({
    body: {
      gap: t.spacing.md,
    },
    pricing: {
      gap: t.spacing.sm,
    },
    priceLabel: {
      flexShrink: 1,
    },
    priceValue: {
      flexShrink: 1,
      textAlign: "right",
      marginLeft: "auto",
    },
    priceRow: {
      flexWrap: "wrap",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.md,
    },
    price: {
      color: t.colors.primary,
      fontFamily: t.typography.subtitle.fontFamily,
    },
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    timelineSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border,
      paddingTop: t.spacing.md,
      gap: t.spacing.md,
    },
    timelineHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
      marginBottom: t.spacing.sm,
    },
    headerLabel: {
      flexShrink: 1,
    },
    summaryLabel: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
    methodChip: {
      alignSelf: "flex-start",
      flexShrink: 1,
    },
    timelineList: {
      gap: t.spacing.lg,
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: t.spacing.md,
    },
    markerColumn: {
      width: 28,
      position: "relative",
      alignItems: "center",
    },
    marker: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    connector: {
      position: "absolute",
      top: 28 + t.spacing.xs,
      bottom: -t.spacing.lg + t.spacing.xs,
      width: StyleSheet.hairlineWidth,
      backgroundColor: t.colors.border,
    },
    timelineContent: {
      flex: 1,
      minWidth: 0,
      gap: t.spacing.xs,
      paddingTop: t.spacing.xs,
    },
    summaryContent: {
      paddingTop: 0,
      gap: t.spacing.sm,
    },
    eyebrow: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
    timelineDetail: {
      marginTop: t.spacing.xs,
    },
    timelineDate: {
      marginTop: t.spacing.xs,
    },
    timelineState: {
      paddingVertical: t.spacing.md,
    },
    timelineError: {
      borderRadius: 14,
      backgroundColor: t.colors.background,
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    timelineStateText: {
      flexShrink: 1,
    },
    retryButton: {
      alignSelf: "flex-start",
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.sm,
    },
    retryLabel: {
      color: t.colors.primary,
    },
    footerContent: {
      gap: t.spacing.md,
    },
    historySection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border,
      gap: t.spacing.sm,
      paddingTop: t.spacing.sm,
    },
    historyToggle: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
    },
    historyHeading: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    historyTitle: {
      flexGrow: 1,
      maxWidth: "100%",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    menuButton: {
      width: 46,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    connectButtonSlot: {
      flex: 1,
      minWidth: 0,
    },
  });
}
