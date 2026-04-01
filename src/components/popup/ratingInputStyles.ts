import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type RatingInputStyles = {
  container: ViewStyle;
  helperText: TextStyle;
  targetName: TextStyle;
  starsRow: ViewStyle;
  starButton: ViewStyle;
  chipsWrap: ViewStyle;
  chipButton: ViewStyle;
  chipButtonActive: ViewStyle;
  chipLabel: TextStyle;
  chipLabelActive: TextStyle;
  commentBlock: ViewStyle;
  commentLabel: TextStyle;
  commentInputWrap: ViewStyle;
  commentInput: TextStyle;
};

export function createRatingInputStyles(t: Theme): RatingInputStyles {
  return {
    container: {
      gap: t.spacing.md,
    },
    helperText: {
      color: t.colors.stateAnulated,
    },
    targetName: {
      color: t.colors.textDark,
    },
    starsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    starButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    chipButton: {
      minHeight: 42,
      paddingHorizontal: t.spacing.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.backgroudWhite,
    },
    chipButtonActive: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    chipLabel: {
      color: t.colors.textDark,
    },
    chipLabelActive: {
      color: t.colors.backgroudWhite,
    },
    commentBlock: {
      gap: t.spacing.sm,
    },
    commentLabel: {
      color: t.colors.stateAnulated,
    },
    commentInputWrap: {
      minHeight: 150,
      borderWidth: 1,
      borderRadius: t.borders.md,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: t.spacing.sm,
    },
    commentInput: {
      flex: 1,
      textAlignVertical: "top",
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.typography.body.fontSize,
      lineHeight: t.typography.body.lineHeight,
      color: t.colors.textDark,
      ...Platform.select({
        web: {
          outlineWidth: 0,
          outlineColor: "transparent",
          borderWidth: 0,
          backgroundColor: "transparent",
        } as TextStyle,
        default: {},
      }),
    },
  };
}
