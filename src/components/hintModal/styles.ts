import { Theme } from "@/src/themes";
import { ViewStyle } from "react-native";

export type HintModalStyles = {
  backdrop: ViewStyle;
  card: ViewStyle;
};

export function createHintModalStyles(t: Theme): HintModalStyles {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.22)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.spacing.lg,
    },
    card: {
      width: "100%",
      borderRadius: t.borders.md,
      backgroundColor: t.colors.backgroudWhite,
      padding: t.spacing.md,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 6,
    },
  };
}
