import { Theme } from "@/src/themes";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

export type InputChatStyles = {
  wrapper: ViewStyle;
  pill: ViewStyle;
  innerRow: ViewStyle;
  textInput: TextStyle;
  buttonsContainer: ViewStyle;
  iconButton: ViewStyle;
  sendButton: ViewStyle;
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
      backgroundColor: t.colors.backgroudWhite,
      borderRadius: t.borders.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
      gap: t.spacing.xs,
    },

    innerRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    textInput: {
      flex: 1,
      fontFamily: t.typography.body.fontFamily,
      fontSize: t.typography.body.fontSize,
      color: t.colors.textMedium,
      paddingTop: t.spacing.xs,
      paddingBottom: t.spacing.xs,
      paddingRight: t.spacing.sm,
    },

    buttonsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },

    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.backgroudWhite,
      shadowColor: t.colors.IconColorGray,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
      marginBottom: 1
    },

    sendButton: {
      width: 32,
      height: 32,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.primaryLight,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
      marginBottom: 1
    },

    previewRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
    },

    previewItem: {
      width: 64,
      height: 64,
      borderRadius: t.borders.sm,
      overflow: "hidden",
      backgroundColor: t.colors.backgroudWhite,
    },

    previewImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    } as ImageStyle,

    previewCloseButton: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.9)",
    },
  };
}
