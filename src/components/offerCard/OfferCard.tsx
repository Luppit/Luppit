import { Icon } from "@/src/components/Icon";
import MarketplaceCardFrame from "@/src/components/marketplaceHub/MarketplaceCardFrame";
import { Text } from "@/src/components/Text";
import { LucideIconName } from "@/src/icons/lucide";
import { PurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { useTheme } from "@/src/themes";
import React from "react";
import { Pressable, View } from "react-native";

export type OfferCardTimelineItem = {
  code: string;
  label: string;
  icon: LucideIconName;
  reached_at?: string | null;
  reached_at_label?: string | null;
  pre_label?: string | null;
  is_completed: boolean;
  is_next: boolean;
};

type OfferCardProps = {
  offer: PurchaseOfferCardData;
  onConnect?: () => void;
  connectLabel?: string;
  onMenuPress?: () => void;
  timeline?: OfferCardTimelineItem[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function OfferCard({
  offer,
  onConnect,
  connectLabel = "Ver conversación",
  onMenuPress,
  timeline = [],
}: OfferCardProps) {
  const t = useTheme();
  const businessName = offer.business_name?.trim() || "Negocio";
  const province = offer.business_province?.trim();
  const rating = offer.business_rating;
  const numRatings = offer.business_num_ratings;
  const currencyCode = offer.offer_currency_code ?? "CRC";
  const pricePrefix = normalize(currencyCode) === "usd" ? "$" : "₡";
  const formattedPrice = `${pricePrefix}${Number(offer.price ?? 0).toLocaleString("en-US")}`;
  const description = offer.description?.trim();

  return (
    <MarketplaceCardFrame
      title={businessName}
      subtitle={province}
      accessibilityLabel={`Oferta de ${businessName} por ${formattedPrice}`}
      body={
        <View style={{ gap: t.spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: t.spacing.md,
            }}
          >
            <Text
              variant="subtitle"
              maxLines={1}
              style={{ color: t.colors.primary, flex: 1 }}
            >
              {formattedPrice}
            </Text>
            {rating != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
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

          {timeline.length > 0 ? (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: t.colors.border,
                paddingTop: t.spacing.md,
                gap: t.spacing.md,
              }}
            >
              {timeline.map((step, index) => {
                const isLast = index === timeline.length - 1;
                const iconBackground = step.is_next
                  ? t.colors.stateAnulated
                  : t.colors.success;

                return (
                  <View
                    key={`${step.code}-${index}`}
                    style={{ flexDirection: "row", alignItems: "stretch", gap: t.spacing.sm }}
                  >
                    <View
                      style={{
                        width: 24,
                        position: "relative",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: iconBackground,
                        }}
                      >
                        <Icon
                          name={step.icon}
                          size={16}
                          color={t.colors.backgroudWhite}
                        />
                      </View>
                      {!isLast ? (
                        <View
                          style={{
                            position: "absolute",
                            left: 11,
                            top: 32,
                            bottom: -t.spacing.sm,
                            width: 2,
                            borderRadius: 1,
                            backgroundColor: t.colors.border,
                          }}
                        />
                      ) : null}
                    </View>

                    <View style={{ flex: 1, paddingBottom: t.spacing.sm }}>
                      {step.is_next ? (
                        <Text color="stateAnulated">
                          {step.pre_label?.trim() || "A la espera de:"}
                        </Text>
                      ) : step.reached_at_label || step.reached_at ? (
                        <Text color="stateAnulated">
                          {step.reached_at_label?.trim() || step.reached_at}
                        </Text>
                      ) : null}
                      <Text variant="label">{step.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      }
      footerLeft={
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.spacing.sm }}>
          {onMenuPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Más opciones de la oferta"
              onPress={onMenuPress}
              style={{
                width: 46,
                height: 44,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: t.colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="ellipsis" size={22} color={t.colors.textDark} />
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={connectLabel}
            onPress={onConnect}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 14,
              backgroundColor: t.colors.textDark,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: t.spacing.xs,
              paddingHorizontal: t.spacing.md,
            }}
          >
            <Icon name="message-circle" size={18} color={t.colors.backgroudWhite} />
            <Text variant="label" maxLines={1} style={{ color: t.colors.backgroudWhite }}>
              {connectLabel}
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}
