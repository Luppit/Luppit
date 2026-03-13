import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type ExpandableInfoCardStyles = {
  container: ViewStyle;
  header: ViewStyle;
  headerLeft: ViewStyle;
  descriptionContainer: ViewStyle;
  title: TextStyle;
  description: TextStyle;
};

export function createExpandableInfoCardStyles(t: Theme): ExpandableInfoCardStyles {
  return {
    container: {
      borderRadius: 18,
      padding: 4,
    },
    header: {
      minHeight: 48,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: t.spacing.sm,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      flex: 1,
      paddingRight: t.spacing.sm,
    },
    descriptionContainer: {
      marginTop: 4,
      borderRadius: 14,
      backgroundColor: t.colors.backgroudWhite,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
      gap: t.spacing.md,
    },
    title: {
      flexShrink: 1,
    },
    description: {
      lineHeight: t.lineHeights.lg,
    },
  };
}
