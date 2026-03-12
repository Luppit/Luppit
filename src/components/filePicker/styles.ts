import { Theme } from "@/src/themes";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

export type FilePickerStyles = {
  container: ViewStyle;
  label: TextStyle;
  box: ViewStyle;
  emptyState: ViewStyle;
  emptyIconWrapper: ViewStyle;
  emptyText: TextStyle;
  highlightText: TextStyle;
  horizontalRowContent: ViewStyle;
  addTile: ViewStyle;
  addTileIcon: ViewStyle;
  fileTile: ViewStyle;
  fileImage: ImageStyle;
  fileFallback: ViewStyle;
  fileFallbackText: TextStyle;
  removeButton: ViewStyle;
  previewBackdrop: ViewStyle;
  previewClose: ViewStyle;
  previewImage: ImageStyle;
};

export function createFilePickerStyles(t: Theme): FilePickerStyles {
  return {
    container: {
      width: "100%",
      marginBottom: t.spacing.lg,
    },
    label: {
      paddingLeft: t.spacing.sm,
      marginBottom: t.spacing.xs,
    },
    box: {
      minHeight: 110,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      backgroundColor: t.colors.backgroudWhite,
      overflow: "hidden",
      justifyContent: "center",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.md,
    },
    emptyIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      color: t.colors.stateAnulated,
    },
    highlightText: {
      color: t.colors.primary,
    },
    horizontalRowContent: {
      paddingHorizontal: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      alignItems: "center",
      gap: t.spacing.sm,
    },
    addTile: {
      width: 72,
      height: 72,
      borderRadius: t.borders.sm,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.colors.backgroudWhite,
    },
    addTileIcon: {
      opacity: 0.7,
    },
    fileTile: {
      width: 86,
      height: 72,
      borderRadius: t.borders.sm,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      overflow: "hidden",
    },
    fileImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    } as ImageStyle,
    fileFallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.spacing.xs,
      backgroundColor: t.colors.background,
    },
    fileFallbackText: {
      color: t.colors.textMedium,
      fontSize: t.fontSizes.xs,
      textAlign: "center",
    },
    removeButton: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: t.colors.backgroudWhite,
      alignItems: "center",
      justifyContent: "center",
    },
    previewBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.82)",
      alignItems: "center",
      justifyContent: "center",
      padding: t.spacing.lg,
    },
    previewClose: {
      position: "absolute",
      top: t.spacing.xl + t.spacing.sm,
      right: t.spacing.lg,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    previewImage: {
      width: "100%",
      height: "70%",
      resizeMode: "contain",
    } as ImageStyle,
  };
}
