import { spacing } from "@/src/themes";
import { Theme } from "@/src/themes/ThemeProvider";
import { ViewStyle } from "react-native";

export type StepperStyles = {
  header: {
    container: ViewStyle;
    icon: ViewStyle;
    content : ViewStyle;
    contentInfo : ViewStyle;
  };
  base: {
    container: ViewStyle;
    contentContainer: ViewStyle;
  };
  circle: {
    counterCenter: ViewStyle;
  };
};

export function createStepperStyles(t: Theme): StepperStyles {
  return {
    header: {
      container: {
        marginHorizontal: spacing.md,
      },
      icon: {
        marginBottom: spacing.lg,
      },
      content: {
        flex: 1,
        flexDirection: "row"
      },
      contentInfo: {
        flex: 1,
        flexDirection: "column",
      }
    },
    base: {
      container: {
        flex: 1,
        overflow: "hidden"
      },
      contentContainer: {
        marginTop: spacing.xl
      }
    },
    circle: {
      counterCenter: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        justifyContent: "center",
      },
    },
  };
}
