import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type OtpValidatorStyles = {
  container: ViewStyle;
  label: TextStyle;
  helperButton: ViewStyle;
  helperText: TextStyle;
  inputRow: ViewStyle;
  inputRowStretch: ViewStyle;
  inputBox: ViewStyle;
  inputBoxStretch: ViewStyle;
  inputBoxFocused: ViewStyle;
  inputText: TextStyle;
  hiddenInput: TextStyle;
};

export function createOtpValidatorStyles(t: Theme): OtpValidatorStyles {
  return {
    container: {
      gap: t.spacing.sm,
      alignItems: "center",
    },
    label: {
      color: t.colors.textDark,
    },
    helperButton: {
      alignSelf: "center",
    },
    helperText: {
      color: t.colors.stateAnulated,
      textDecorationLine: "underline",
      textAlign: "center",
      alignSelf: "center",
    },
    inputRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: t.spacing.sm,
    },
    inputRowStretch: {
      width: "78%",
      maxWidth: 272,
      alignSelf: "center",
    },
    inputBox: {
      width: 52,
      height: 56,
      borderRadius: t.borders.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: t.colors.backgroudWhite,
    },
    inputBoxStretch: {
      flex: 1,
      width: undefined,
    },
    inputBoxFocused: {
      borderColor: t.colors.primary,
    },
    inputText: {
      width: "100%",
      textAlign: "center",
      color: t.colors.textDark,
      fontSize: 22,
      lineHeight: 32,
      fontWeight: "600",
      paddingVertical: 0,
      includeFontPadding: false,
    },
    hiddenInput: {
      position: "absolute",
      width: 1,
      height: 1,
      opacity: 0,
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
