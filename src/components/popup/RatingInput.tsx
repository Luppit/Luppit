import LuppitChip from "@/src/components/chip/LuppitChip";
import { Text } from "@/src/components/Text";
import TextArea from "@/src/components/textArea/TextArea";
import { lucideIcons } from "@/src/icons/lucide";
import { useTheme } from "@/src/themes";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { createRatingInputStyles } from "./ratingInputStyles";

type RatingValue = {
  stars: number;
  tags: string[];
  comment: string;
};

type RatingInputProps = {
  label: string;
  hideLabel?: boolean;
  helperText?: string | null;
  errorText?: string | null;
  componentConfig?: Record<string, unknown> | null;
  onChange?: (value: RatingValue) => void;
};

const StarIcon = lucideIcons.star;

function toPositiveInteger(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const parsed = Math.floor(value);
  return parsed > 0 ? parsed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

export default function RatingInput({
  label,
  hideLabel = false,
  helperText,
  errorText,
  componentConfig,
  onChange,
}: RatingInputProps) {
  const t = useTheme();
  const s = useMemo(() => createRatingInputStyles(t), [t]);

  const starsMin = useMemo(
    () => toPositiveInteger(componentConfig?.stars_min, 1),
    [componentConfig]
  );
  const starsMax = useMemo(
    () => toPositiveInteger(componentConfig?.stars_max, 5),
    [componentConfig]
  );
  const chips = useMemo(() => toStringArray(componentConfig?.chips), [componentConfig]);
  const commentPlaceholder = useMemo(
    () =>
      typeof componentConfig?.comment_placeholder === "string"
        ? componentConfig.comment_placeholder
        : "Cuéntanos tu experiencia",
    [componentConfig]
  );
  const targetName = useMemo(
    () =>
      typeof componentConfig?.target_name === "string"
        ? componentConfig.target_name
        : "",
    [componentConfig]
  );
  const allowMultipleTags =
    typeof componentConfig?.allow_multiple_tags === "boolean"
      ? componentConfig.allow_multiple_tags
      : true;

  const [stars, setStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const emit = (next: { stars?: number; tags?: string[]; comment?: string }) => {
    onChange?.({
      stars: next.stars ?? stars,
      tags: next.tags ?? selectedTags,
      comment: next.comment ?? comment,
    });
  };

  const handleStarsPress = (value: number) => {
    const boundedValue = Math.max(starsMin, Math.min(value, starsMax));
    setStars(boundedValue);
    emit({ stars: boundedValue });
  };

  const handleTagPress = (tag: string) => {
    const isSelected = selectedTags.includes(tag);
    let next = selectedTags;
    if (isSelected) {
      next = selectedTags.filter((item) => item !== tag);
    } else if (allowMultipleTags) {
      next = [...selectedTags, tag];
    } else {
      next = [tag];
    }

    setSelectedTags(next);
    emit({ tags: next });
  };

  const handleCommentChange = (value: string) => {
    setComment(value);
    emit({ comment: value });
  };

  return (
    <View style={s.container}>
      {!hideLabel && label.trim() ? (
        <Text variant="body" style={s.label}>
          {label}
        </Text>
      ) : null}

      {targetName ? (
        <Text variant="body" style={s.targetName}>
          {targetName}
        </Text>
      ) : null}
      {helperText ? (
        <Text variant="small" style={s.helperText}>
          {helperText}
        </Text>
      ) : null}

      <View style={s.starsBlock}>
        <View style={s.starsRow}>
          {Array.from({ length: starsMax }).map((_, index) => {
            const value = index + 1;
            const isFilled = value <= stars;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${value} de ${starsMax} estrellas`}
                accessibilityState={{ checked: stars === value }}
                onPress={() => handleStarsPress(value)}
                style={s.starButton}
              >
                <StarIcon
                  size={30}
                  color={isFilled ? t.colors.accentYellow : t.colors.border}
                  fill={isFilled ? t.colors.accentYellow : "transparent"}
                />
              </Pressable>
            );
          })}
        </View>
        {stars > 0 ? (
          <Text variant="small" style={s.ratingStatus}>
            {stars} de {starsMax} estrellas
          </Text>
        ) : null}
        {errorText ? (
          <Text
            variant="small"
            style={s.fieldError}
            accessibilityRole="alert"
          >
            {errorText}
          </Text>
        ) : null}
      </View>

      {chips.length > 0 ? (
        <View style={s.chipsWrap}>
          {chips.map((chip) => {
            const isSelected = selectedTags.includes(chip);
            return (
              <LuppitChip
                key={chip}
                label={chip}
                bordered
                selected={isSelected}
                onPress={() => handleTagPress(chip)}
              />
            );
          })}
        </View>
      ) : null}

      <View style={s.commentBlock}>
        <Text variant="small" color="textMedium">
          Comentarios
        </Text>
        <TextArea
          value={comment}
          onChangeText={handleCommentChange}
          placeholder={commentPlaceholder}
          placeholderTextColor={t.colors.textMedium}
          accessibilityLabel="Comentarios, opcional"
          baseContainerStyle={s.commentTextArea}
        />
      </View>
    </View>
  );
}
