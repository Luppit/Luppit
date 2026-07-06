import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

const SOFT_BORDER_COLOR = "rgba(0,0,0,0.08)";

export type RatingInputStyles = {
  container: ViewStyle;
  label: TextStyle;
  helperText: TextStyle;
  starsRow: ViewStyle;
  starButton: ViewStyle;
  chipsWrap: ViewStyle;
  chipButton: ViewStyle;
  chipButtonActive: ViewStyle;
  chipLabel: TextStyle;
  chipLabelActive: TextStyle;
  commentBlock: ViewStyle;
  commentInputWrap: ViewStyle;
  commentInput: TextStyle;
};

export function createRatingInputStyles(t: Theme): RatingInputStyles {
  return {
    container: {
      gap: t.spacing.md,
    },
    label: {
      color: t.colors.textDark,
    },
    helperText: {
      color: t.colors.stateAnulated,
    },
    starsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
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
      borderColor: SOFT_BORDER_COLOR,
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
    commentInputWrap: {
      minHeight: 136,
      borderWidth: 1,
      borderRadius: t.borders.md,
      borderColor: SOFT_BORDER_COLOR,
      backgroundColor: t.colors.backgroudWhite,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
    },
    commentInput: {
      flex: 1,
      textAlignVertical: "top",
      ...t.typography.body,
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
