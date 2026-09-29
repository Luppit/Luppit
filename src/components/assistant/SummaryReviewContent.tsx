import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React, { useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";

export type SummaryReviewImage = { uri: string; caption?: string };
export type SummaryReviewRow = { label: string; value: string };
export type SummaryDeliveryRow = {
  label: string;
  detail?: string;
  amount?: string;
  icon?: "truck" | "store";
};

type Props = {
  title: string;
  variant?: "review" | "popup";
  subtitle?: string | null;
  quantity?: string | null;
  images?: SummaryReviewImage[];
  imageNoun?: string;
  onImagePress?: (index: number) => void;
  price?: { label: string; value: string; detail?: string | null } | null;
  description?: string | null;
  rows?: SummaryReviewRow[];
  rowsTitle?: string;
  deliveryRows?: SummaryDeliveryRow[];
};

export default function SummaryReviewContent({
  title,
  variant = "review",
  subtitle,
  quantity,
  images = [],
  imageNoun = "fotos",
  onImagePress,
  price,
  description,
  rows = [],
  rowsTitle = "Detalles",
  deliveryRows = [],
}: Props) {
  const t = useTheme();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const activeImage = previewIndex === null ? null : images[previewIndex];
  const borderStyle = { borderWidth: 1, borderColor: t.colors.border, borderRadius: t.borders.md };

  return (
    <View style={{ gap: t.spacing.md }}>
      {images.length === 0 ? (
        <View style={{ paddingHorizontal: t.spacing.xs, paddingTop: t.spacing.xs,
          paddingBottom: t.spacing.md, borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
          <Text variant="title" accessibilityRole="header">{title}</Text>
          {rows.length === 0 && subtitle ? (
            <Text variant="small" color="textMedium">{subtitle}</Text>
          ) : null}
          {rows.length === 0 && quantity ? (
            <Text variant="small" color="textMedium">{quantity}</Text>
          ) : null}
        </View>
      ) : (
      <Pressable
        accessibilityRole={images.length > 0 ? "button" : undefined}
        accessibilityLabel={images.length > 0 ? `Ver ${images.length} ${imageNoun} de ${title}` : undefined}
        disabled={images.length === 0}
        onPress={() => onImagePress ? onImagePress(0) : setPreviewIndex(0)}
        style={[borderStyle, {
          flexDirection: "row",
          alignItems: "center",
          gap: t.spacing.md,
          padding: t.spacing.sm,
          backgroundColor: t.colors.backgroudWhite,
        }]}
      >
        {images.length > 0 ? (
          <View style={{ width: 120, height: 100, flexShrink: 0 }}>
            {images.length > 1 ? (
              <Image
                source={{ uri: images[1].uri }}
                style={{ position: "absolute", right: 0, top: 4, width: 108, height: 92,
                  borderRadius: t.borders.sm, backgroundColor: t.colors.background }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ position: "absolute", left: 0, top: 0,
              width: images.length > 1 ? 110 : 120, height: 100,
              borderRadius: t.borders.sm, backgroundColor: t.colors.background,
              borderWidth: 2, borderColor: t.colors.backgroudWhite,
              overflow: "hidden" }}>
              <Image source={{ uri: images[0].uri }} resizeMode="cover"
                style={{ width: "100%", height: "100%", transform: [{ scale: 1.15 }] }} />
            </View>
            {images.length > 1 ? (
              <View style={{ position: "absolute", top: 0, right: 0, minWidth: 30,
                minHeight: 30, borderRadius: 15, alignItems: "center", justifyContent: "center",
                backgroundColor: t.colors.background, paddingHorizontal: t.spacing.xs }}>
                <Text variant="small" style={{ fontFamily: t.typography.subtitle.fontFamily }}>
                  +{images.length - 1}
                </Text>
              </View>
            ) : null}
            <View style={{ position: "absolute", left: 5, bottom: 5,
              flexDirection: "row", alignItems: "center", gap: 4,
              paddingHorizontal: 7, paddingVertical: 3,
              maxWidth: images.length > 1 ? 100 : 110,
              borderRadius: 999, backgroundColor: "rgba(25,25,25,0.84)" }}>
              <Icon name="image" size={14} color={t.colors.backgroudWhite} />
              <Text variant="small" maxLines={1} style={{ color: t.colors.backgroudWhite,
                fontSize: 12, lineHeight: 16 }}>
                Ver {images.length === 1 ? "foto" : "fotos"}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={{ flex: 1, gap: t.spacing.xs, paddingVertical: t.spacing.xs,
          justifyContent: "center" }}>
          <Text variant="subtitle">{title}</Text>
          {subtitle ? <Text variant="small" color="textMedium">{subtitle}</Text> : null}
          {quantity && variant === "popup" ? (
            <Text variant="body" color="textMedium">{quantity}</Text>
          ) : quantity ? (
            <View style={{ alignSelf: "flex-start", borderRadius: 999,
              paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.xs,
              backgroundColor: t.colors.background }}>
              <Text variant="small">{quantity}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      )}

      {price ? (
        <View style={{ borderRadius: t.borders.md, backgroundColor: t.colors.background,
          padding: t.spacing.md, gap: t.spacing.xs }}>
          <Text variant="small" color="textMedium">{price.label}</Text>
          <Text variant="price">{price.value}</Text>
          {price.detail ? <Text variant="small" color="textMedium">{price.detail}</Text> : null}
        </View>
      ) : null}

      {rows.length > 0 ? (
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="small" color="textMedium">{rowsTitle}</Text>
          <View style={[borderStyle, { overflow: "hidden" }]}>
            {rows.map((row, index) => (
              <View key={`${row.label}-${index}`} style={{
                flexDirection: "row", gap: t.spacing.sm,
                paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.sm,
                borderBottomWidth: index < rows.length - 1 ? 1 : 0,
                borderBottomColor: t.colors.border,
              }}>
                <Text variant="small" color="textMedium" style={{ flex: 0.4 }}>{row.label}</Text>
                <Text variant="small" align="right" style={{ flex: 0.6 }}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {description ? (
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="small" color="textMedium">Descripción</Text>
          <View style={{ borderRadius: t.borders.md, backgroundColor: t.colors.background,
            padding: t.spacing.sm }}>
            <Text variant="body">{description}</Text>
          </View>
        </View>
      ) : null}

      {deliveryRows.length > 0 ? (
        <View style={{ gap: t.spacing.sm }}>
          <Text variant="small" color="textMedium">Opciones de entrega</Text>
          <View style={[borderStyle, { overflow: "hidden" }]}>
            {deliveryRows.map((row, index) => (
              <View key={`${row.label}-${index}`} style={{ flexDirection: "row", gap: t.spacing.sm,
                padding: t.spacing.sm, alignItems: "center",
                borderBottomWidth: index < deliveryRows.length - 1 ? 1 : 0,
                borderBottomColor: t.colors.border }}>
                {row.icon ? (
                  <View style={{ width: 36, height: 36, borderRadius: 18,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: t.colors.background }}>
                    <Icon name={row.icon} size={19} color={t.colors.textMedium} />
                  </View>
                ) : null}
                <View style={{ flex: 1, gap: t.spacing.xs }}>
                  <Text variant="body">{row.label}</Text>
                  {row.detail ? <Text variant="small" color="textMedium">{row.detail}</Text> : null}
                </View>
                {row.amount ? <Text variant="small">{row.amount}</Text> : null}
              </View>
            ))}
          </View>
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
