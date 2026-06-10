import { Theme } from "@/src/themes";
import { TextStyle, ViewStyle } from "react-native";

export type StatusChipStyles = {
  container: ViewStyle;
  dot: ViewStyle;
  label: TextStyle;
};

export function createStatusChipStyles(t: Theme): StatusChipStyles {
  return {
    container: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      minHeight: 32,
      backgroundColor: t.colors.primaryLight,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: t.colors.primary,
      flexShrink: 0,
    },
    label: {
      color: t.colors.textDark,
      flexShrink: 1,
    },
  };
}
