import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type RatingInputStyles = {
  container: ViewStyle;
  label: TextStyle;
  targetName: TextStyle;
  helperText: TextStyle;
  starsBlock: ViewStyle;
  starsRow: ViewStyle;
  starButton: ViewStyle;
  ratingStatus: TextStyle;
  fieldError: TextStyle;
  chipsWrap: ViewStyle;
  commentBlock: ViewStyle;
  commentTextArea: ViewStyle;
};

export function createRatingInputStyles(t: Theme): RatingInputStyles {
  return {
    container: {
      gap: t.spacing.md,
    },
    label: {
      color: t.colors.textDark,
    },
    targetName: {
      color: t.colors.textMedium,
    },
    helperText: {
      color: t.colors.textMedium,
    },
    starsBlock: {
      alignItems: "center",
      gap: t.spacing.xs,
    },
    starsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.xs,
    },
    starButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    ratingStatus: {
      color: t.colors.textMedium,
      textAlign: "center",
    },
    fieldError: {
      color: t.colors.error,
      textAlign: "center",
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    commentBlock: {
      gap: t.spacing.sm,
    },
    commentTextArea: {
      marginBottom: 0,
    },
  };
}
