import { Theme } from "@/src/themes";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

export type InputChatStyles = {
  wrapper: ViewStyle;
  pill: ViewStyle;
  innerRow: ViewStyle;
  inputArea: ViewStyle;
  textInput: TextStyle;
  textInputOverlay: TextStyle;
  textMeasure: TextStyle;
  buttonsContainer: ViewStyle;
  iconButton: ViewStyle;
  iconButtonPressed: ViewStyle;
  iconButtonDisabled: ViewStyle;
  sendButton: ViewStyle;
  sendButtonPressed: ViewStyle;
  sendButtonDisabled: ViewStyle;
  sendButtonBusy: ViewStyle;
  previewRow: ViewStyle;
  previewItem: ViewStyle;
  previewImage: ImageStyle;
  previewCloseButton: ViewStyle;
};

export function createInputChatStyles(t: Theme): InputChatStyles {
  return {
    wrapper: {
      paddingHorizontal: 0,
      paddingVertical: 0,
      backgroundColor: t.colors.background,
    },

    pill: {
      flexDirection: "column",
      alignItems: "stretch",
      minHeight: 56,
      backgroundColor: t.colors.backgroudWhite,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: "rgba(221,221,221,0.72)",
      paddingLeft: t.spacing.md,
      paddingRight: t.spacing.xs,
      paddingVertical: t.spacing.xs + 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
      gap: t.spacing.sm,
    },

    innerRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: t.spacing.xs,
    },

    inputArea: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      maxHeight: 144,
      overflow: "hidden",
    },

    textInput: {
      width: "100%",
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.typography.body.fontSize,
      lineHeight: t.typography.body.lineHeight,
      color: t.colors.textDark,
      paddingTop: 11,
      paddingBottom: 11,
      paddingLeft: 0,
      paddingRight: 0,
    },

    textInputOverlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },

    textMeasure: {
      opacity: 0,
    },

    buttonsContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: t.spacing.xs,
    },

    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },

    iconButtonPressed: {
      backgroundColor: "rgba(28,28,28,0.06)",
    },

    iconButtonDisabled: {
      opacity: 0.45,
    },

    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 2,
    },

    sendButtonPressed: {
      opacity: 0.88,
    },

    sendButtonDisabled: {
      backgroundColor: t.colors.primaryLight,
      opacity: 0.72,
      shadowOpacity: 0,
      elevation: 0,
    },

    sendButtonBusy: {
      backgroundColor: t.colors.primary,
      opacity: 1,
    },

    previewRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
      paddingRight: t.spacing.sm,
    },

    previewItem: {
      width: 58,
      height: 58,
      borderRadius: t.borders.sm,
      overflow: "hidden",
      backgroundColor: t.colors.border,
    },

    previewImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    } as ImageStyle,

    previewCloseButton: {
      position: "absolute",
      top: 3,
      right: 3,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.9)",
      borderWidth: 1,
      borderColor: "rgba(221,221,221,0.7)",
    },
  };
}
