import { Theme } from "@/src/themes";
import { Platform, TextStyle, ViewStyle } from "react-native";

export type OtpVerifierStyles = {
  label: ViewStyle;
  otpCodeContainer: ViewStyle;
  otpCodeInputContainer: ViewStyle;
  otpCodeInput: TextStyle;
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
    },
    otpCodeInput: {
      flex: 1,
      textAlign: "center",
      fontSize: t.fontSizes.lg,
      fontFamily: t.typography.body.fontFamily,
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
