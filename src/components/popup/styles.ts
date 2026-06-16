import { Theme } from "@/src/themes";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

export type GlobalPopupStyles = {
  backdrop: ViewStyle;
  bottomSheet: ViewStyle;
  bottomSheetClip: ViewStyle;
  bottomSheetHighlight: ViewStyle;
  indicatorTouchArea: ViewStyle;
  indicator: ViewStyle;
  optionButton: ViewStyle;
  optionLabel: TextStyle;
  separator: ViewStyle;
  section: ViewStyle;
  filterSection: ViewStyle;
  filterLabel: TextStyle;
  filterInputContainer: ViewStyle;
  filterInput: TextStyle;
  filterDateRow: ViewStyle;
  filterDateField: ViewStyle;
  filterDateFieldInput: TextStyle;
  filterChipsRow: ViewStyle;
  filterChip: ViewStyle;
  filterChipSelected: ViewStyle;
  filterChipLabel: TextStyle;
  filterChipLabelSelected: TextStyle;
  filterActionsRow: ViewStyle;
  filterActionButton: ViewStyle;
  filterActionButtonPrimary: ViewStyle;
  filterActionButtonSecondary: ViewStyle;
  filterActionLabel: TextStyle;
  filterActionLabelPrimary: TextStyle;
  filterActionLabelSecondary: TextStyle;
  sortOptionsList: ViewStyle;
  sortOptionButton: ViewStyle;
  sortOptionLabel: TextStyle;
  sortRadioOuter: ViewStyle;
  sortRadioOuterSelected: ViewStyle;
  sortRadioInner: ViewStyle;
  sortSeparator: ViewStyle;
  summaryHeaderBlock: ViewStyle;
  summaryHeader: ViewStyle;
  summaryHeaderSeparator: ViewStyle;
  summaryTitle: TextStyle;
  summaryDescription: TextStyle;
  summaryDescriptionScroll: ViewStyle;
  summaryDescriptionScrollContent: ViewStyle;
  summaryRowsList: ViewStyle;
  summaryInputsList: ViewStyle;
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
  datePickerBackdrop: ViewStyle;
  datePickerCard: ViewStyle;
  datePickerHeader: ViewStyle;
  datePicker: ViewStyle;
  datePickerActionsRow: ViewStyle;
  summaryActionsRow: ViewStyle;
  summaryActionButton: ViewStyle;
  summaryActionButtonSingle: ViewStyle;
  summaryActionLabel: TextStyle;
  helperContentScroll: ViewStyle;
  helperContentScrollContent: ViewStyle;
  helperSectionsList: ViewStyle;
  helperSectionBlock: ViewStyle;
  helperSectionHeader: ViewStyle;
  helperSectionAnswer: ViewStyle;
  helperSectionTitle: TextStyle;
  helperSectionSubtitle: TextStyle;
  helperBody: TextStyle;
  helperRowSeparator: ViewStyle;
  helperOverlayBackdrop: ViewStyle;
  helperOverlaySheet: ViewStyle;
  profileSwitcherSection: ViewStyle;
  profileSwitcherRow: ViewStyle;
  profileSwitcherRowActive: ViewStyle;
  profileSwitcherAvatar: ViewStyle;
  profileSwitcherInitials: TextStyle;
  profileSwitcherContent: ViewStyle;
  profileSwitcherTitleRow: ViewStyle;
  profileSwitcherTitle: TextStyle;
  profileSwitcherMetaRow: ViewStyle;
  profileSwitcherMetaDot: ViewStyle;
  profileSwitcherMetaText: TextStyle;
  profileSwitcherSeparator: ViewStyle;
};

export function createGlobalPopupStyles(t: Theme): GlobalPopupStyles {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.shadow,
    },
    bottomSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    bottomSheetClip: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      overflow: "hidden",
    },
    bottomSheetHighlight: {
      ...t.glass.topHighlight,
      left: 16,
      top: 8,
      width: "72%",
    },
    indicatorTouchArea: {
      alignItems: "center",
      paddingTop: t.spacing.sm,
      paddingBottom: t.spacing.md,
    },
    indicator: {
      width: 96,
      height: 4,
      borderRadius: 999,
      backgroundColor: t.colors.stateAnulated,
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
    filterSection: {
      gap: t.spacing.sm,
    },
    filterLabel: {
      color: t.colors.textDark,
    },
    filterInputContainer: {
      height: 48,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      paddingHorizontal: t.spacing.md,
      justifyContent: "center",
    },
    filterInput: {
      color: t.colors.textDark,
      paddingVertical: 0,
    },
    filterDateRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
    },
    filterDateField: {
      flex: 1,
      height: 48,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      paddingHorizontal: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    filterDateFieldInput: {
      flex: 1,
      color: t.colors.textDark,
      paddingVertical: 0,
    },
    filterChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.spacing.sm,
    },
    filterChip: {
      minHeight: 40,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      paddingHorizontal: t.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: t.spacing.xs,
    },
    filterChipSelected: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    filterChipLabel: {
      color: t.colors.textDark,
    },
    filterChipLabelSelected: {
      color: t.colors.backgroudWhite,
    },
    filterActionsRow: {
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.md,
      paddingTop: t.spacing.sm,
      flexDirection: "row",
      gap: t.spacing.sm,
    },
    filterActionButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: t.borders.md,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: t.spacing.xs,
      paddingHorizontal: t.spacing.md,
      borderWidth: 1,
    },
    filterActionButtonPrimary: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    filterActionButtonSecondary: {
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
    },
    filterActionLabel: {
      textAlign: "center",
    },
    filterActionLabelPrimary: {
      color: t.colors.backgroudWhite,
    },
    filterActionLabelSecondary: {
      color: t.colors.textDark,
    },
    sortOptionsList: {
      backgroundColor: "transparent",
    },
    sortOptionButton: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
    },
    sortOptionLabel: {
      flex: 1,
      color: t.colors.textDark,
    },
    sortRadioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.stateAnulated,
      alignItems: "center",
      justifyContent: "center",
    },
    sortRadioOuterSelected: {
      borderColor: t.colors.textDark,
    },
    sortRadioInner: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: t.colors.textDark,
    },
    sortSeparator: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
      marginLeft: 40,
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
    summaryDescriptionScroll: {
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.borders.sm,
      backgroundColor: t.colors.backgroudWhite,
    },
    summaryDescriptionScrollContent: {
      padding: t.spacing.md,
    },
    summaryRowsList: {
      gap: t.spacing.md,
    },
    summaryInputsList: {
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
    datePickerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.34)",
      justifyContent: "center",
      paddingHorizontal: t.spacing.md,
    },
    datePickerCard: {
      padding: t.spacing.md,
      gap: t.spacing.md,
    },
    datePickerHeader: {
      gap: t.spacing.xs,
    },
    datePicker: {
      height: 216,
      alignSelf: "stretch",
    },
    datePickerActionsRow: {
      flexDirection: "row",
      gap: t.spacing.sm,
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
    helperContentScroll: {
      borderRadius: t.borders.md,
      backgroundColor: t.colors.background,
    },
    helperContentScrollContent: {},
    helperSectionsList: {
      gap: 0,
    },
    helperSectionBlock: {},
    helperSectionHeader: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.md,
    },
    helperSectionAnswer: {
      paddingBottom: t.spacing.md,
      paddingRight: t.spacing.lg,
    },
    helperSectionTitle: {
      flex: 1,
      minWidth: 0,
      color: t.colors.textDark,
    },
    helperSectionSubtitle: {
      color: t.colors.textMedium,
      lineHeight: 22,
    },
    helperBody: {
      color: t.colors.textMedium,
      lineHeight: 22,
    },
    helperRowSeparator: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
    },
    helperOverlayBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.24)",
    },
    helperOverlaySheet: {
      width: "100%",
    },
    profileSwitcherSection: {
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.lg,
    },
    profileSwitcherRow: {
      minHeight: 92,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.md,
    },
    profileSwitcherRowActive: {},
    profileSwitcherAvatar: {
      width: 62,
      height: 62,
      borderRadius: 31,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    profileSwitcherInitials: {
      color: t.colors.textDark,
      fontFamily: t.typography.label.fontFamily,
    },
    profileSwitcherContent: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    profileSwitcherTitleRow: {
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    profileSwitcherTitle: {
      color: t.colors.textDark,
      flex: 1,
      minWidth: 0,
    },
    profileSwitcherMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    profileSwitcherMetaDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: t.colors.error,
      flexShrink: 0,
    },
    profileSwitcherMetaText: {
      color: t.colors.stateAnulated,
      flex: 1,
      minWidth: 0,
    },
    profileSwitcherSeparator: {
      borderTopWidth: 1,
      borderTopColor: t.colors.border,
      marginLeft: 74,
    },
  };
}
