import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type OtpVerifierStyles = {
  label: ViewStyle;
  otpCodeContainer: ViewStyle;
  otpCodeInputContainer: ViewStyle;
  otpCodeInputContainerFocused: ViewStyle;
  otpCodeInput: TextStyle;
  otpHiddenInput: TextStyle;
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
      textAlign: "center",
      fontSize: t.fontSizes.lg,
      lineHeight: t.fontSizes.lg + 10,
      fontFamily: t.typography.body.fontFamily,
      color: t.colors.textDark,
      includeFontPadding: false,
    },
    otpHiddenInput: {
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
    resendCodeView: {
      flexDirection: "row",
    },
  };
}
