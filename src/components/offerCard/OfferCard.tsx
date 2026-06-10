import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { LucideIconName } from "@/src/icons/lucide";
import { openPopup } from "@/src/services/popup.service";
import { PurchaseOfferCardData } from "@/src/services/purchase.offer.service";
import { useTheme } from "@/src/themes";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { createOfferCardStyles } from "./styles";

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
  connectLabel = "Conectar",
  timeline = [],
}: OfferCardProps) {
  const t = useTheme();
  const s = useMemo(() => createOfferCardStyles(t), [t]);
  const businessName = offer.business_name?.trim() || "Negocio";
  const province = offer.business_province?.trim();
  const rating = offer.business_rating ?? 0;
  const numRatings = offer.business_num_ratings ?? 0;
  const currencyCode = offer.offer_currency_code ?? "CRC";
  const pricePrefix = normalize(currencyCode) === "usd" ? "$" : "₡";
  const formattedPrice = `${pricePrefix}${Number(offer.price ?? 0).toLocaleString("en-US")}`;
  const badgeText = rating >= 4.7 ? "Mejor reputación" : "Mejor oferta";

  return (
    <GlassSurface
      variant="surface"
      highlight
      style={s.surface}
      contentStyle={s.container}
    >
      <View style={s.topRow}>
        <View style={s.businessBlock}>
          <Text variant="subtitleRegular" maxLines={1} style={s.businessName}>
            {businessName}
          </Text>
          {province ? (
            <Text variant="body" maxLines={1} style={s.province}>
              {province}
            </Text>
          ) : null}
        </View>

        <View style={s.priceBlock}>
          <Text variant="subtitle" maxLines={1} style={s.priceText}>
            {formattedPrice}
          </Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <View style={s.ratingRow}>
          <Icon name="star" size={16} color={t.colors.accentYellow} />
          <Text variant="body" maxLines={1} style={s.ratingText}>
            {rating.toFixed(1)}
          </Text>
          <Text variant="body" maxLines={1} color="stateAnulated">
            ({numRatings})
          </Text>
        </View>

        <View style={s.badge}>
          <View style={s.badgeDot} />
          <Text variant="body" maxLines={1} style={s.badgeText}>
            {badgeText}
          </Text>
        </View>
      </View>

      {timeline.length > 0 ? (
        <>
          <View style={s.separator} />
          <View style={s.timelineContainer}>
            {timeline.map((step, index) => {
              const isLast = index === timeline.length - 1;
              const iconColor = t.colors.backgroudWhite;
              const iconContainerStyle = step.is_next
                ? [s.timelineIconCircle, s.timelineIconCirclePending]
                : [s.timelineIconCircle, { backgroundColor: t.colors.success }];

              return (
                <View key={`${step.code}-${index}`} style={s.timelineRow}>
                  <View style={s.timelineIconColumn}>
                    <View style={iconContainerStyle}>
                      <Icon name={step.icon} size={18} color={iconColor} />
                    </View>
                    {!isLast ? (
                      <View
                        style={[
                          s.timelineConnector,
                          {
                            backgroundColor: t.colors.border,
                            bottom: -t.spacing.sm,
                          },
                        ]}
                      />
                    ) : null}
                  </View>

                  <View style={s.timelineTextContainer}>
                    {step.is_next ? (
                      <Text color="stateAnulated" style={s.timelineDateText}>
                        {step.pre_label?.trim() || "A la espera de:"}
                      </Text>
                    ) : step.reached_at_label || step.reached_at ? (
                      <Text color="stateAnulated" style={s.timelineDateText}>
                        {step.reached_at_label?.trim() || step.reached_at}
                      </Text>
                    ) : null}
                    <Text variant="subtitle" style={s.timelineLabelText}>
                      {step.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : null}

      <View style={s.actionsRow}>
        <Pressable
          style={s.menuButton}
          onPress={() =>
            openPopup({
              options: [
                {
                  id: "reject",
                  label: "Rechazar oferta",
                  icon: "trash-2",
                  textColorKey: "error",
                  iconColorKey: "error",
                },
              ],
            })
          }
        >
          <Icon name="ellipsis" size={24} color={t.colors.backgroudWhite} />
        </Pressable>

        <Pressable style={s.connectButton} onPress={onConnect}>
          <Text variant="body" style={s.connectText}>
            {connectLabel}
          </Text>
        </Pressable>
      </View>
    </GlassSurface>
  );
}
