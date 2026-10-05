import { Icon } from "@/src/components/Icon";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";

export type SummaryReviewImage = { uri: string; caption?: string };
export type SummaryReviewRow = { label: string; value: string };
export type SummaryPriceRow = { label: string; detail?: string; value?: string };
export type SummaryDeliveryRow = {
  label: string;
  detail?: string;
  amount?: string;
  icon?: "truck" | "store";
  selected?: boolean;
};

type Props = {
  title: string;
  variant?: "review" | "popup";
  subtitle?: string | null;
  quantity?: string | null;
  images?: SummaryReviewImage[];
  imageNoun?: string;
  photosTitle?: string;
  onImagePress?: (index: number) => void;
  price?: { label: string; value: string; detail?: string | null } | null;
  description?: string | null;
  rows?: SummaryReviewRow[];
  rowsTitle?: string;
  pricingRows?: SummaryPriceRow[];
  deliveryRows?: SummaryDeliveryRow[];
};

export default function SummaryReviewContent({
  title,
  variant = "review",
  subtitle,
  quantity,
  images = [],
  imageNoun = "fotos",
  photosTitle = "Fotos",
  onImagePress,
  price,
  description,
  rows = [],
  rowsTitle = "Detalles",
  pricingRows = [],
  deliveryRows = [],
}: Props) {
  const t = useTheme();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const activeImage = previewIndex === null ? null : images[previewIndex];
  const { width, fontScale } = useWindowDimensions();
  const stack = width < 360 || fontScale > 1.3;
  const panelStyle = [createRoundedSurfaceStyle(t), {
    borderRadius: t.borders.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    gap: t.spacing.sm,
  }];
  const separatorStyle = { height: 1, backgroundColor: t.colors.border };
  const rowStyle = {
    flexDirection: stack ? "column" as const : "row" as const,
    alignItems: stack ? "stretch" as const : "center" as const,
    gap: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  };
  const hasPricing = pricingRows.length > 0;

  return (
    <View style={{ gap: t.spacing.md }}>
      {price || hasPricing ? (
        <View style={[panelStyle, { gap: t.spacing.xs }]}>
          {pricingRows.map((row, index) => (
            <React.Fragment key={`${row.label}-${index}`}>
              <View accessible accessibilityLabel={[row.label, row.detail, row.value].filter(Boolean).join(". ")}
                style={rowStyle}>
                <View style={{ flex: stack ? undefined : 1, gap: t.spacing.xs }}>
                  <Text variant="body">{row.label}</Text>
                  {row.detail ? <Text variant="small" color="textMedium">{row.detail}</Text> : null}
                </View>
                {row.value && (index > 0 || row.value !== price?.value) ? (
                  <Text variant="body" align={stack ? "left" : "right"}
                    style={stack ? undefined : { maxWidth: "45%", flexShrink: 1 }}>{row.value}</Text>
                ) : null}
              </View>
              {index < pricingRows.length - 1 || price ? <View style={separatorStyle} /> : null}
            </React.Fragment>
          ))}
          {price ? (
            <View accessible accessibilityLabel={[price.label, price.value, !hasPricing && price.detail].filter(Boolean).join(". ")}
              style={rowStyle}>
              <View style={{ flex: stack ? undefined : 1, gap: t.spacing.xs }}>
                <Text variant="body">{price.label}</Text>
                {!hasPricing && price.detail ? <Text variant="small" color="textMedium">{price.detail}</Text> : null}
              </View>
              <Text variant="title" align={stack ? "left" : "right"}
                style={stack ? undefined : { maxWidth: "55%", flexShrink: 1 }}>{price.value}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {!hasPricing && rows.length > 0 ? (
        <View style={[panelStyle, { gap: t.spacing.xs }]}>
          <Text variant="subtitle" accessibilityRole="header">{rowsTitle}</Text>
          {rows.map((row, index) => (
            <React.Fragment key={`${row.label}-${index}`}>
              <View accessible accessibilityLabel={`${row.label}: ${row.value}`} style={rowStyle}>
                <Text variant="small" color="textMedium" style={{ flex: stack ? undefined : 0.4 }}>{row.label}</Text>
                <Text variant="small" align={stack ? "left" : "right"} style={{ flex: stack ? undefined : 0.6 }}>{row.value}</Text>
              </View>
              {index < rows.length - 1 ? <View style={separatorStyle} /> : null}
            </React.Fragment>
          ))}
        </View>
      ) : null}

      <View style={panelStyle}>
        <Text variant="subtitle" accessibilityRole="header">Descripción</Text>
        <Text variant="body">{title}</Text>
        {description ? <Text variant="body" color="textMedium">{description}</Text> : null}
        {rows.length === 0 && !hasPricing && subtitle ? <Text variant="small" color="textMedium">{subtitle}</Text> : null}
        {rows.length === 0 && !hasPricing && quantity ? <Text variant="small" color="textMedium">{quantity}</Text> : null}
      </View>

      {images.length > 0 ? (
        <View style={panelStyle}>
          <Text variant="subtitle" accessibilityRole="header">{photosTitle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.spacing.sm }}>
            {images.map((image, index) => (
              <Pressable key={`${image.uri}-${index}`} accessibilityRole="button"
                accessibilityLabel={image.caption ?? `Ver ${imageNoun === "fotos" ? "foto" : imageNoun} de ${title}, ${index + 1} de ${images.length}`}
                onPress={() => onImagePress ? onImagePress(index) : setPreviewIndex(index)}
                style={{ width: 112, height: 104, borderRadius: t.borders.sm,
                  overflow: "hidden", backgroundColor: t.colors.background }}>
                <Image source={{ uri: image.uri }} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
                <View style={{ position: "absolute", left: t.spacing.xs, bottom: t.spacing.xs,
                  flexDirection: "row", alignItems: "center", gap: t.spacing.xs,
                  paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.xs,
                  borderRadius: t.borders.sm, backgroundColor: "rgba(25,25,25,0.84)" }}>
                  <Icon name="image" size={14} color={t.colors.backgroudWhite} />
                  <Text variant="small" style={{ color: t.colors.backgroudWhite }}>Ver foto</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {deliveryRows.length > 0 ? (
        <View style={panelStyle}>
          <Text variant="subtitle" accessibilityRole="header">{variant === "popup" ? "Entrega" : "Opciones de entrega"}</Text>
          {deliveryRows.map((row, index) => (
            <React.Fragment key={`${row.label}-${index}`}>
              <View style={{ flexDirection: "row", gap: t.spacing.sm, paddingVertical: t.spacing.sm, alignItems: "center" }}>
                {row.icon ? <Icon name={row.icon} size={28} color={t.colors.textMedium} /> : null}
                <View style={{ flex: 1, gap: t.spacing.xs }}>
                  <Text variant="body">{row.label}</Text>
                  {row.selected ? <Text variant="small" color="textMedium">Seleccionado</Text> : null}
                  {row.detail ? <Text variant="small" color="textMedium">{row.detail}</Text> : null}
                  {row.amount ? <Text variant="small">{row.amount}</Text> : null}
                </View>
              </View>
              {index < deliveryRows.length - 1 ? <View style={separatorStyle} /> : null}
            </React.Fragment>
          ))}
        </View>
      ) : null}

      <Modal
        transparent
        visible={!onImagePress && activeImage != null}
        animationType="fade"
        onRequestClose={() => setPreviewIndex(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
          alignItems: "center", justifyContent: "center",
          paddingHorizontal: t.spacing.md, paddingVertical: t.spacing.xl }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar imagen"
            onPress={() => setPreviewIndex(null)}
            hitSlop={12}
            style={{ position: "absolute", top: t.spacing.xl, right: t.spacing.lg,
              zIndex: 2, width: 40, height: 40, borderRadius: 20,
              alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.16)" }}
          >
            <Icon name="x" size={24} color={t.colors.backgroudWhite} />
          </Pressable>
          {activeImage ? (
            <Image source={{ uri: activeImage.uri }} resizeMode="contain"
              accessibilityLabel={activeImage.caption ?? `Imagen ${previewIndex! + 1}`}
              style={{ width: "100%", height: "82%" }} />
          ) : null}
          {images.length > 1 && previewIndex !== null ? (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel="Imagen anterior"
                onPress={() => setPreviewIndex((previewIndex - 1 + images.length) % images.length)}
                hitSlop={12}
                style={{ position: "absolute", left: t.spacing.md, top: "48%",
                  width: 44, height: 44, borderRadius: 22, alignItems: "center",
                  justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" }}>
                <Icon name="arrow-left" size={24} color={t.colors.backgroudWhite} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Imagen siguiente"
                onPress={() => setPreviewIndex((previewIndex + 1) % images.length)}
                hitSlop={12}
                style={{ position: "absolute", right: t.spacing.md, top: "48%",
                  width: 44, height: 44, borderRadius: 22, alignItems: "center",
                  justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" }}>
                <Icon name="arrow-right" size={24} color={t.colors.backgroudWhite} />
              </Pressable>
              <Text variant="small" style={{ color: t.colors.backgroudWhite,
                position: "absolute", bottom: t.spacing.xl, alignSelf: "center" }}>
                {previewIndex + 1} / {images.length}
              </Text>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
