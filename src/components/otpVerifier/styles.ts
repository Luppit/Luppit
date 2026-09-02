import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type OtpVerifierStyles = {
  label: ViewStyle;
  otpCodeContainer: ViewStyle;
  otpCodeInputContainer: ViewStyle;
  otpCodeInputContainerFocused: ViewStyle;
  otpCodeInput: TextStyle;
  otpCaret: ViewStyle;
  otpHiddenInput: TextStyle;
  pasteCodeButton: ViewStyle;
  resendCodeView: ViewStyle;
  errorView: ViewStyle;
  inputState: {
    error : ViewStyle;
    success : ViewStyle;
  }
};

export function createOtpVerifierStyles(t: Theme): OtpVerifierStyles {
  return {
    inputState: {
      error: {
        borderColor: t.colors.error,
      },
      success: {
        borderColor: t.colors.primary,
      },
    },
    errorView: {
      marginBottom: t.spacing.md,
    },
    label: {
      marginBottom: t.spacing.md,
    },
    otpCodeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: t.spacing.md,
      ...Platform.select({
        android: {
          position: "relative",
        } as ViewStyle,
        default: {},
      }),
    },
    otpCodeInputContainer: {
      width: 50,
      height: 60,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        android: {
          zIndex: 2,
        } as ViewStyle,
        default: {},
      }),
    },
    otpCodeInputContainerFocused: {
      borderColor: t.colors.primary,
    },
    otpCodeInput: {
      ...t.typography.subtitle,
      textAlign: "center",
      color: t.colors.textDark,
      includeFontPadding: false,
    },
    otpCaret: {
      width: 2,
      height: t.typography.subtitle.lineHeight,
      borderRadius: 1,
      backgroundColor: t.colors.primary,
    },
    otpHiddenInput: {
      position: "absolute",
      ...Platform.select({
        android: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1,
          padding: 0,
          borderWidth: 0,
          color: "transparent",
          backgroundColor: "transparent",
        } as TextStyle,
        web: {
          width: 1,
          height: 1,
          opacity: 0,
          outlineWidth: 0,
          outlineColor: "transparent",
          borderWidth: 0,
          backgroundColor: "transparent",
        } as TextStyle,
        default: {
          width: 1,
          height: 1,
          opacity: 0,
        } as TextStyle,
      }),
    },
    pasteCodeButton: {
      minHeight: 48,
      alignSelf: "flex-start",
      justifyContent: "center",
      marginBottom: t.spacing.md,
    },
    resendCodeView: {
      flexDirection: "row",
    },
  };
}
