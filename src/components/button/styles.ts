import type { Theme } from "@/src/themes/ThemeProvider";
import type { TextStyle, ViewStyle } from "react-native";

export type ButtonVariant = "dark" | "white" | "disabled";

export type ButtonStyles = {
  base: {
    container: ViewStyle;
    label: TextStyle;
  };
  variants: {
    container: Record<ButtonVariant, ViewStyle>;
    label: Record<ButtonVariant, TextStyle>;
  };
  states: { pressed: ViewStyle };
};

export function createButtonStyles(t: Theme): ButtonStyles {
  return {
    base: {
      container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 16,
        padding: 10,
        width: "100%",
        height: 44
      },
      label: {
        textAlign: "center",
      },
    },
    variants: {
      container: {
        dark: { backgroundColor: t.colors.textDark },
        white: {
          backgroundColor: t.colors.background,
          borderWidth: 1,
          borderColor: t.colors.border,
        },
        disabled: { backgroundColor: t.colors.border },
      },
      label: {
        dark: { color: t.colors.background },
        white: { color: t.colors.textDark },
        disabled: { color: t.colors.textDark },
      },
    },
    states: {
      pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    },
  };
}
