import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type OptionsChecklistCardStyles = {
  container: ViewStyle;
  header: ViewStyle;
  headerIconWrap: ViewStyle;
  headerTextBlock: ViewStyle;
  row: ViewStyle;
  rowPressable: ViewStyle;
  separator: ViewStyle;
  checkbox: ViewStyle;
  checkboxChecked: ViewStyle;
  labelRow: ViewStyle;
  label: TextStyle;
  hintButton: ViewStyle;
  expandedContent: ViewStyle;
};

export function createOptionsChecklistCardStyles(t: Theme): OptionsChecklistCardStyles {
  const checkboxSize = 24;
  const rowHorizontal = t.spacing.md;
  const checkboxGap = t.spacing.sm;

  return {
    container: {
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.md,
      overflow: "hidden",
      backgroundColor: t.colors.backgroudWhite,
      marginBottom: t.spacing.lg,
    },
    header: {
      backgroundColor: t.colors.primaryLight,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    headerIconWrap: {
      width: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTextBlock: {
      flex: 1,
      gap: 2,
    },
    row: {
      backgroundColor: t.colors.backgroudWhite,
    },
    rowPressable: {
      minHeight: 60,
      paddingHorizontal: rowHorizontal,
      paddingVertical: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: checkboxGap,
    },
    separator: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    checkbox: {
      width: checkboxSize,
      height: checkboxSize,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.colors.stateAnulated,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.backgroudWhite,
    },
    checkboxChecked: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primary,
    },
    labelRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    label: {
      flexShrink: 1,
    },
    hintButton: {
      alignItems: "center",
      justifyContent: "center",
    },
    expandedContent: {
      paddingLeft: rowHorizontal + checkboxSize + checkboxGap,
      paddingRight: rowHorizontal,
      paddingBottom: t.spacing.md,
      gap: t.spacing.xs,
    },
  };
}
