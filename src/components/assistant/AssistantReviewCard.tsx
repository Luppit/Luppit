import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { View } from "react-native";
import SummaryReviewContent, {
  type SummaryDeliveryRow,
  type SummaryReviewImage,
  type SummaryPriceRow,
} from "./SummaryReviewContent";

export type AssistantReviewRow = {
  label: string;
  value: string;
};

export type AssistantReviewNotice = {
  text: string;
  tone?: "neutral" | "error";
};

type AssistantReviewCardProps = {
  completionTitle: string;
  completionDescription: string;
  isComplete?: boolean;
  title: string;
  subtitle?: string | null;
  quantity?: string | null;
  images?: SummaryReviewImage[];
  imageNoun?: string;
  photosTitle?: string;
  description?: string | null;
  rows: AssistantReviewRow[];
  rowsTitle?: string;
  pricingRows?: SummaryPriceRow[];
  price?: { label: string; value: string; detail?: string | null } | null;
  deliveryRows?: SummaryDeliveryRow[];
  children?: React.ReactNode;
  notices?: AssistantReviewNotice[];
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  secondaryDisabled?: boolean;
  onSecondaryPress?: () => void;
};

export default function AssistantReviewCard({
  completionTitle,
  completionDescription,
  isComplete = true,
  title,
  subtitle,
  quantity,
  images,
  imageNoun,
  photosTitle,
  description,
  rows,
  rowsTitle,
  pricingRows,
  price,
  deliveryRows,
  children,
  notices = [],
  primaryLabel,
  primaryDisabled = false,
  primaryLoading = false,
  onPrimaryPress,
  secondaryLabel,
  secondaryDisabled = false,
  onSecondaryPress,
}: AssistantReviewCardProps) {
  const t = useTheme();

  return (
    <View style={{ alignSelf: "stretch", gap: t.spacing.md }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: t.spacing.md,
          padding: t.spacing.md,
          borderRadius: t.borders.md,
          backgroundColor: isComplete ? t.colors.primaryLight : t.colors.background,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isComplete ? t.colors.backgroudWhite : t.colors.border,
          }}
        >
          <Icon
            name={isComplete ? "check" : "info"}
            size={23}
            color={isComplete ? t.colors.primary : t.colors.textMedium}
            strokeWidth={2.5}
          />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subtitle">{completionTitle}</Text>
          <Text variant="small" color="textMedium">
            {completionDescription}
          </Text>
        </View>
      </View>

      <SummaryReviewContent
        title={title}
        subtitle={subtitle}
        quantity={quantity}
        images={images}
        imageNoun={imageNoun}
        photosTitle={photosTitle}
        description={description}
        rows={rows}
        rowsTitle={rowsTitle}
        pricingRows={pricingRows}
        price={price}
        deliveryRows={deliveryRows}
      />

      {children}

      {notices.map((notice, index) => {
        const isError = notice.tone === "error";
        return (
          <View
            key={`${notice.text}-${index}`}
            style={{
              borderRadius: t.borders.md,
              borderWidth: 1,
              borderColor: isError ? t.colors.error : t.colors.border,
              backgroundColor: isError
                ? t.colors.backgroudWhite
                : t.colors.background,
              padding: t.spacing.sm,
            }}
          >
            <Text variant="small" color={isError ? "error" : "textMedium"}>
              {notice.text}
            </Text>
          </View>
        );
      })}

      <View style={{ gap: t.spacing.sm }}>
        <Button
          title={primaryLabel}
          variant="dark"
          disabled={primaryDisabled}
          loading={primaryLoading}
          onPress={onPrimaryPress}
        />
        {secondaryLabel && onSecondaryPress ? (
          <Button
            title={secondaryLabel}
            icon="sliders-horizontal"
            variant="white"
            disabled={secondaryDisabled}
            onPress={onSecondaryPress}
          />
        ) : null}
      </View>
    </View>
  );
}
