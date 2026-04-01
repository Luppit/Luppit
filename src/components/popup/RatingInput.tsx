import { Text } from "@/src/components/Text";
import { lucideIcons } from "@/src/icons/lucide";
import { useTheme } from "@/src/themes";
import React, { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { createRatingInputStyles } from "./ratingInputStyles";

type RatingValue = {
  stars: number;
  tags: string[];
  comment: string;
};

type RatingInputProps = {
  label: string;
  helperText?: string | null;
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
  helperText,
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
      {targetName ? (
        <Text variant="subtitleRegular" style={s.targetName}>
          {targetName}
        </Text>
      ) : null}
      {helperText ? (
        <Text variant="caption" style={s.helperText}>
          {helperText}
        </Text>
      ) : null}

      <View style={s.starsRow}>
        {Array.from({ length: starsMax }).map((_, index) => {
          const value = index + 1;
          const isSelected = value <= stars;
          return (
            <Pressable
              key={value}
              onPress={() => handleStarsPress(value)}
              style={s.starButton}
              hitSlop={8}
            >
              <StarIcon
                size={30}
                color={isSelected ? t.colors.accentYellow : t.colors.border}
                fill={isSelected ? t.colors.accentYellow : "transparent"}
              />
            </Pressable>
          );
        })}
      </View>

      {chips.length > 0 ? (
        <View style={s.chipsWrap}>
          {chips.map((chip) => {
            const isSelected = selectedTags.includes(chip);
            return (
              <Pressable
                key={chip}
                style={[s.chipButton, isSelected ? s.chipButtonActive : null]}
                onPress={() => handleTagPress(chip)}
              >
                <Text
                  variant="body"
                  style={isSelected ? s.chipLabelActive : s.chipLabel}
                >
                  {chip}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={s.commentBlock}>
        <Text variant="subtitleRegular" style={s.commentLabel}>
          Comentarios
        </Text>
        <View style={s.commentInputWrap}>
          <TextInput
            value={comment}
            onChangeText={handleCommentChange}
            placeholder={commentPlaceholder}
            placeholderTextColor={t.colors.border}
            multiline
            textAlignVertical="top"
            style={s.commentInput}
          />
        </View>
      </View>
    </View>
  );
}
