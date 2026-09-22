import { Icon } from "@/src/components/Icon";
import Button from "@/src/components/button/Button";
import LuppitChip from "@/src/components/chip/LuppitChip";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import { Text } from "@/src/components/Text";
import { LucideIconName } from "@/src/icons/lucide";
import { PurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { Theme, useTheme } from "@/src/themes";
import { formatConversationOfferPrice } from "@/src/utils/conversationOfferPrice";
import React, { useMemo } from "react";
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

  return (
    <MarketplaceCardFrame
      title={businessName}
      subtitle={province}
      footerDivider={hasTimelineSection}
      accessibilityLabel={`Oferta de ${businessName} por ${formattedPrice}`}
      body={
        <View style={s.body}>
          <View style={s.priceRow}>
            <Text variant="subtitle" style={s.price}>
              {formattedPrice}
            </Text>
            {rating != null ? (
              <View style={s.ratingRow}>
                <Icon name="star" size={16} color={t.colors.accentYellow} />
                <Text variant="body" maxLines={1}>
                  {rating.toFixed(1)}
                  {numRatings != null ? ` (${numRatings})` : ""}
                </Text>
              </View>
            ) : null}
          </View>

          {description ? (
            <Text variant="body" color="textMedium" maxLines={2}>
              {description}
            </Text>
          ) : null}

          {hasTimelineSection ? (
            <View style={s.timelineSection}>
              <View style={s.timelineHeader}>
                <Text
                  variant="small"
                  color="textMedium"
                  accessibilityRole="header"
                  maxFontSizeMultiplier={2}
                >
                  Seguimiento
                </Text>
                {methodLabel ? (
                  <LuppitChip
                    label={methodLabel}
                    icon={methodIcon}
                    bordered
                    labelMaxLines={2}
                    accessibilityLabel={`Método de entrega: ${methodLabel}`}
                    style={s.methodChip}
                  />
                ) : null}
              </View>

              {timelineActions}

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
                  {timeline.map((step, index) => {
                    const isLast = index === timeline.length - 1;
                    const markerColor = resolveTimelineColor(step.style_code, t);

                    return (
                      <View
                        key={`${step.code}-${index}`}
                        accessible
                        accessibilityRole="text"
                        accessibilityLabel={step.accessibility_label?.trim() || step.label}
                        style={s.timelineRow}
                      >
                        <View
                          accessible={false}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          style={s.markerColumn}
                        >
                          <View style={s.marker}>
                            <Icon
                              name={step.icon}
                              size={20}
                              color={markerColor}
                            />
                          </View>
                          {!isLast ? <View style={s.connector} /> : null}
                        </View>

                        <View style={s.timelineContent}>
                          {step.pre_label?.trim() ? (
                            <Text
                              variant="small"
                              color="textMedium"
                              maxFontSizeMultiplier={2}
                              style={s.eyebrow}
                            >
                              {step.pre_label.trim()}
                            </Text>
                          ) : null}
                          <Text
                            variant="body"
                            maxFontSizeMultiplier={2}
                            style={[
                              s.timelineLabel,
                              step.is_next ? s.timelineLabelActive : null,
                            ]}
                          >
                            {step.label}
                          </Text>
                          {step.detail?.trim() ? (
                            <Text
                              variant="body"
                              color="textMedium"
                              maxFontSizeMultiplier={2}
                              style={s.timelineDetail}
                            >
                              {step.detail.trim()}
                            </Text>
                          ) : null}
                          {step.reached_at_label?.trim() || step.reached_at?.trim() ? (
                            <Text
                              variant="small"
                              color="textMedium"
                              maxFontSizeMultiplier={2}
                              style={s.timelineDate}
                            >
                              {step.reached_at_label?.trim() || step.reached_at?.trim()}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </View>
      }
      footerLeft={
        <View style={s.footer}>
          {onMenuPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Más opciones de la oferta"
              onPress={onMenuPress}
              style={s.menuButton}
            >
              <Icon name="ellipsis" size={22} color={t.colors.textDark} />
            </Pressable>
          ) : null}

          <View style={s.connectButtonSlot}>
            <Button title={connectLabel} icon="message-circle" onPress={onConnect} />
          </View>
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
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.md,
    },
    price: {
      color: t.colors.primary,
      flex: 1,
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
    eyebrow: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
    timelineLabel: {
      color: t.colors.textDark,
    },
    timelineLabelActive: {
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
