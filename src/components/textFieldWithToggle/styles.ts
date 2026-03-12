import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type TextFieldWithToggleStyles = {
  container: ViewStyle;
  label: TextStyle;
  row: ViewStyle;
  inputContainer: ViewStyle;
  inputContainerFocused: ViewStyle;
  inputContainerError: ViewStyle;
  input: TextStyle;
  toggleContainer: ViewStyle;
  toggleOption: ViewStyle;
  toggleOptionActive: ViewStyle;
  toggleOptionInactive: ViewStyle;
  toggleLabel: TextStyle;
  errorLabel: TextStyle;
};

export function createTextFieldWithToggleStyles(t: Theme): TextFieldWithToggleStyles {
  return {
    container: {
      marginBottom: t.spacing.lg,
      width: "100%",
    },
    label: {
      paddingLeft: t.spacing.sm,
      marginBottom: t.spacing.xs,
    },
    row: {
      width: "100%",
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.xs,
    },
    inputContainer: {
      flex: 1,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      height: 44,
      paddingHorizontal: t.spacing.sm,
      justifyContent: "center",
      backgroundColor: t.colors.backgroudWhite,
    },
    inputContainerFocused: {
      borderWidth: 2,
    },
    inputContainerError: {
      borderColor: t.colors.error,
    },
    input: {
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
    toggleContainer: {
      width: 86,
      borderRadius: t.borders.sm,
      borderWidth: 1,
      borderColor: t.colors.border,
      overflow: "hidden",
      backgroundColor: t.colors.backgroudWhite,
    },
    toggleOption: {
      minHeight: 21,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.spacing.xs,
    },
    toggleOptionActive: {},
    toggleOptionInactive: {
      backgroundColor: t.colors.backgroudWhite,
    },
    toggleLabel: {
      lineHeight: t.lineHeights.xs,
    },
    errorLabel: {
      color: t.colors.error,
      marginTop: t.spacing.xs,
      paddingLeft: t.spacing.sm,
    },
  };
}
