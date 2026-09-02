import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type OtpVerifierStyles = {
  label: ViewStyle;
  otpCodeContainer: ViewStyle;
  otpCodeInputContainer: ViewStyle;
  otpCodeInputContainerFocused: ViewStyle;
  otpCodeInput: TextStyle;
  otpCaret: ViewStyle;
  otpAndroidInput: TextStyle;
  otpHiddenInput: TextStyle;
  resendCodeButton: ViewStyle;
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
    },
    otpCodeInputContainer: {
      width: 50,
      height: 60,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      alignItems: "center",
      justifyContent: "center",
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
    otpAndroidInput: {
      ...t.typography.subtitle,
      width: "100%",
      height: 60,
      marginBottom: t.spacing.md,
      paddingHorizontal: t.spacing.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      color: t.colors.textDark,
      backgroundColor: t.colors.backgroudWhite,
      textAlign: "center",
      textAlignVertical: "center",
      letterSpacing: t.spacing.md,
      fontVariant: ["tabular-nums"],
      includeFontPadding: false,
    },
    otpHiddenInput: {
      position: "absolute",
      ...Platform.select({
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
    resendCodeButton: {
      minHeight: 48,
      justifyContent: "center",
    },
    resendCodeView: {
      flexDirection: "row",
      alignItems: "center",
    },
  };
}
