import { Theme } from "@/src/themes";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

export type GlobalPopupStyles = {
  backdrop: ViewStyle;
  bottomSheet: ViewStyle;
  indicator: ViewStyle;
  optionButton: ViewStyle;
  optionLabel: TextStyle;
  separator: ViewStyle;
  section: ViewStyle;
  summaryHeaderBlock: ViewStyle;
  summaryHeader: ViewStyle;
  summaryHeaderSeparator: ViewStyle;
  summaryTitle: TextStyle;
  summaryDescription: TextStyle;
  summaryRowsList: ViewStyle;
  summaryRowBlock: ViewStyle;
  summaryImageBlock: ViewStyle;
  summaryRowLabel: TextStyle;
  summaryRowValue: TextStyle;
  summaryImageContainer: ViewStyle;
  summaryImageScrollContent: ViewStyle;
  summaryImageItem: ViewStyle;
  summaryImage: ImageStyle;
  summaryImagePreviewImage: ImageStyle;
  summaryImagePreviewBackdrop: ViewStyle;
  summaryImagePreviewClose: ViewStyle;
  summaryActionsRow: ViewStyle;
  summaryActionButton: ViewStyle;
  summaryActionButtonSingle: ViewStyle;
  summaryActionLabel: TextStyle;
};

export function createGlobalPopupStyles(t: Theme): GlobalPopupStyles {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.shadow,
    },
    bottomSheet: {
      backgroundColor: t.colors.backgroudWhite,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: "hidden",
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: -2 },
      shadowRadius: 10,
      elevation: 8,
    },
    indicator: {
      alignSelf: "center",
      width: 96,
      height: 4,
      borderRadius: 999,
      backgroundColor: t.colors.stateAnulated,
      marginTop: t.spacing.sm,
      marginBottom: t.spacing.md,
      opacity: 0.7,
    },
    optionButton: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    optionLabel: {
      flex: 1,
    },
    separator: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
      marginHorizontal: t.spacing.md,
    },
    section: {
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.md,
      gap: t.spacing.md,
    },
    summaryHeaderBlock: {
      gap: t.spacing.xs,
    },
    summaryHeader: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    summaryHeaderSeparator: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    summaryTitle: {
      flex: 1,
    },
    summaryDescription: {
      color: t.colors.textDark,
    },
    summaryRowsList: {
      gap: t.spacing.md,
    },
    summaryRowBlock: {
      gap: t.spacing.xs,
    },
    summaryImageBlock: {
      gap: t.spacing.md,
    },
    summaryRowLabel: {
      color: t.colors.stateAnulated,
    },
    summaryRowValue: {
      color: t.colors.textDark,
    },
    summaryImageContainer: {
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      paddingVertical: t.spacing.xs,
      backgroundColor: t.colors.backgroudWhite,
    },
    summaryImageScrollContent: {
      paddingHorizontal: t.spacing.xs,
      gap: t.spacing.xs,
    },
    summaryImageItem: {
      width: 64,
      height: 64,
      borderRadius: t.borders.sm,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.background,
    },
    summaryImage: {
      width: "100%",
      height: "100%",
    } as ImageStyle,
    summaryImagePreviewImage: {
      width: "100%",
      height: "70%",
      resizeMode: "contain",
    } as ImageStyle,
    summaryImagePreviewBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.82)",
      alignItems: "center",
      justifyContent: "center",
      padding: t.spacing.lg,
    },
    summaryImagePreviewClose: {
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
    summaryActionsRow: {
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.md,
      paddingTop: t.spacing.md,
      flexDirection: "row",
      gap: t.spacing.sm,
    },
    summaryActionButton: {
      flex: 1,
      minHeight: 56,
      borderRadius: t.borders.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: t.spacing.xs,
      borderWidth: 1,
      borderColor: t.colors.border,
      paddingHorizontal: t.spacing.sm,
    },
    summaryActionButtonSingle: {
      flex: 0,
      width: "100%",
    },
    summaryActionLabel: {},
  };
}
