import Button from "@/src/components/button/Button";
import { Icon } from "@/src/components/Icon";
import { createRoundedSurfaceStyle } from "@/src/components/surface/styles";
import { Text } from "@/src/components/Text";
import { useTheme } from "@/src/themes";
import React from "react";
import { View } from "react-native";

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
  title: string;
  description?: string | null;
  rows: AssistantReviewRow[];
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
  title,
  description,
  rows,
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
        style={[
          createRoundedSurfaceStyle(t),
          {
            borderWidth: 1,
            borderColor: t.colors.border,
            padding: t.spacing.md,
            gap: t.spacing.md,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: t.spacing.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.colors.primaryLight,
            }}
          >
            <Icon
              name="check"
              size={23}
              color={t.colors.primary}
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

        <View style={{ height: 1, backgroundColor: t.colors.border }} />

        <View style={{ gap: t.spacing.sm }}>
          <Text variant="title">{title}</Text>
          {description ? <Text variant="body">{description}</Text> : null}
        </View>

        {rows.length > 0 ? (
          <View style={{ borderTopWidth: 1, borderTopColor: t.colors.border }}>
            {rows.map((row, index) => (
              <View
                key={`${row.label}-${index}`}
                style={{
                  minHeight: 48,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: t.spacing.md,
                  paddingVertical: t.spacing.sm,
                  borderBottomWidth: index < rows.length - 1 ? 1 : 0,
                  borderBottomColor: t.colors.border,
                }}
              >
                <Text
                  variant="small"
                  color="stateAnulated"
                  style={{ flex: 0.42 }}
                >
                  {row.label}
                </Text>
                <Text
                  variant="body"
                  align="right"
                  style={{ flex: 0.58 }}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

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
      </View>

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
