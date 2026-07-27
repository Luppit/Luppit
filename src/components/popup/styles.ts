import {
  ROUNDED_SURFACE_RADIUS,
  createRoundedSurfaceStyle,
} from "@/src/components/surface/styles";
import { fontFamilies, Theme } from "@/src/themes";
import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from "react-native";

const SOFT_BORDER_COLOR = "rgba(0,0,0,0.08)";
const SOFT_SEPARATOR_COLOR = "rgba(0,0,0,0.08)";

export type GlobalPopupStyles = {
  backdrop: ViewStyle;
  bottomSheetFrame: ViewStyle;
  bottomSheet: ViewStyle;
  bottomSheetKeyboardVisible: ViewStyle;
  bottomSheetFill: ViewStyle;
  bottomSheetSurface: ViewStyle;
  bottomSheetContent: ViewStyle;
  successSheetFrame: ViewStyle;
  successSheet: ViewStyle;
  successSheetContent: ViewStyle;
  sheetContentScroll: ViewStyle;
  sheetContentScrollKeyboardVisible: ViewStyle;
  sheetContentScrollContent: ViewStyle;
  indicatorTouchArea: ViewStyle;
  indicator: ViewStyle;
  optionButton: ViewStyle;
  optionList: ViewStyle;
  optionLabel: TextStyle;
  separator: ViewStyle;
  section: ViewStyle;
  filterSection: ViewStyle;
  filterInputContainer: ViewStyle;
  filterInput: TextStyle;
  filterDateRow: ViewStyle;
  filterDateField: ViewStyle;
  filterDateFieldInput: TextStyle;
  filterChipsRow: ViewStyle;
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
  summaryCloseButton: ViewStyle;
  summaryTitle: TextStyle;
  summaryMetadata: TextStyle;
  summaryDescription: TextStyle;
  summaryDescriptionScroll: ViewStyle;
  summaryDescriptionScrollContent: ViewStyle;
  summaryRowsList: ViewStyle;
  summaryInputsList: ViewStyle;
  summaryTextArea: ViewStyle;
  summaryTextAreaInput: ViewStyle;
  summaryTextAreaText: TextStyle;
  summaryTextAreaHelper: TextStyle;
  choiceInput: ViewStyle;
  choiceInputLabel: TextStyle;
  choiceHelperText: TextStyle;
  choiceOptionsList: ViewStyle;
  choiceOption: ViewStyle;
  choiceOptionSelected: ViewStyle;
  choiceOptionDisabled: ViewStyle;
  choiceOptionContent: ViewStyle;
  choiceOptionHeader: ViewStyle;
  choiceOptionLabel: TextStyle;
  choiceOptionMeta: TextStyle;
  choiceOptionDisabledReason: TextStyle;
  choiceSetupAction: ViewStyle;
  choiceSetupActionLabel: TextStyle;
  choiceInputError: TextStyle;
  summaryBlocker: ViewStyle;
  summaryBlockerMessage: TextStyle;
  summaryBlockerAction: ViewStyle;
  summaryBlockerActionLabel: TextStyle;
  summaryFeedback: ViewStyle;
  summaryFeedbackIcon: ViewStyle;
  summaryFeedbackContent: ViewStyle;
  summaryFeedbackTitle: TextStyle;
  summaryFeedbackMessage: TextStyle;
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
  datePickerSheet: ViewStyle;
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
  profileSwitcherAction: ViewStyle;
  profileSwitcherActionText: TextStyle;
};

export function createGlobalPopupStyles(t: Theme): GlobalPopupStyles {
  return {
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.shadow,
    },
    bottomSheetFrame: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: t.spacing.sm,
    },
    bottomSheet: {
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
      flexShrink: 1,
    },
    bottomSheetKeyboardVisible: {
      height: "100%",
    },
    bottomSheetFill: {
      flex: 1,
    },
    bottomSheetSurface: {
      width: "100%",
      flexShrink: 1,
    },
    bottomSheetContent: {
      overflow: "hidden",
      borderRadius: t.glass.radius.sheet,
      flexShrink: 1,
    },
    successSheetFrame: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
    },
    successSheet: {
      width: "100%",
    },
    successSheetContent: {
      overflow: "hidden",
      borderRadius: t.glass.radius.sheet,
    },
    sheetContentScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    sheetContentScrollKeyboardVisible: {
      flex: 1,
    },
    sheetContentScrollContent: {
      paddingBottom: t.spacing.xs,
    },
    indicatorTouchArea: {
      alignItems: "center",
      paddingTop: t.spacing.sm,
      paddingBottom: t.spacing.sm,
    },
    indicator: {
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: t.colors.stateAnulated,
      opacity: 0.45,
    },
    optionButton: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    optionList: {
      marginHorizontal: t.spacing.md,
      marginBottom: t.spacing.sm,
      overflow: "hidden",
      borderRadius: ROUNDED_SURFACE_RADIUS,
    },
    optionLabel: {
      flex: 1,
    },
    separator: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SOFT_SEPARATOR_COLOR,
      marginLeft: 48,
    },
    section: {
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.md,
      gap: t.spacing.md,
    },
    filterSection: {
      gap: t.spacing.sm,
    },
    filterInputContainer: {
      height: 48,
      borderRadius: t.borders.md,
      borderWidth: 1,
      borderColor: SOFT_BORDER_COLOR,
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
      borderRadius: t.borders.md,
      borderWidth: 1,
      borderColor: SOFT_BORDER_COLOR,
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
    filterActionsRow: {
      paddingHorizontal: t.spacing.md,
      paddingBottom: t.spacing.sm,
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
      borderColor: SOFT_BORDER_COLOR,
    },
    filterActionButtonPrimary: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    filterActionButtonSecondary: {
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
      overflow: "hidden",
      ...createRoundedSurfaceStyle(t),
    },
    sortOptionButton: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.md,
      paddingHorizontal: t.spacing.md,
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
      borderColor: SOFT_BORDER_COLOR,
      alignItems: "center",
      justifyContent: "center",
    },
    sortRadioOuterSelected: {
      borderColor: t.colors.primary,
    },
    sortRadioInner: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: t.colors.primary,
    },
    sortSeparator: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SOFT_SEPARATOR_COLOR,
      marginLeft: 56,
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
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SOFT_SEPARATOR_COLOR,
    },
    summaryCloseButton: {
      width: 44,
      height: 44,
      marginVertical: -4,
      marginRight: -8,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryTitle: {
      flex: 1,
    },
    summaryMetadata: {
      color: t.colors.textMedium,
    },
    summaryDescription: {
      color: t.colors.textDark,
    },
    summaryDescriptionScroll: {
      ...createRoundedSurfaceStyle(t),
    },
    summaryDescriptionScrollContent: {
      padding: t.spacing.md,
    },
    summaryRowsList: {
      gap: t.spacing.md,
      padding: t.spacing.md,
      ...createRoundedSurfaceStyle(t),
    },
    summaryInputsList: {
      gap: t.spacing.md,
    },
    summaryTextArea: {
      gap: t.spacing.xs,
    },
    summaryTextAreaInput: {
      minHeight: 120,
      alignItems: "flex-start",
      paddingVertical: t.spacing.sm,
    },
    summaryTextAreaText: {
      minHeight: 96,
      textAlignVertical: "top",
    },
    summaryTextAreaHelper: {
      color: t.colors.textMedium,
    },
    choiceInput: {
      gap: t.spacing.xs,
    },
    choiceInputLabel: {
      color: t.colors.textDark,
    },
    choiceHelperText: {
      color: t.colors.textMedium,
    },
    choiceOptionsList: {
      gap: t.spacing.sm,
      marginTop: t.spacing.xs,
    },
    choiceOption: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.spacing.md,
      padding: t.spacing.md,
      borderWidth: 1,
      borderColor: SOFT_BORDER_COLOR,
      borderRadius: ROUNDED_SURFACE_RADIUS,
      backgroundColor: t.colors.backgroudWhite,
    },
    choiceOptionSelected: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primaryLight,
    },
    choiceOptionDisabled: {
      opacity: 0.66,
    },
    choiceOptionContent: {
      flex: 1,
      gap: t.spacing.xs,
    },
    choiceOptionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: t.spacing.sm,
    },
    choiceOptionLabel: {
      flex: 1,
      color: t.colors.textDark,
    },
    choiceOptionMeta: {
      color: t.colors.textMedium,
    },
    choiceOptionDisabledReason: {
      color: t.colors.error,
    },
    choiceSetupAction: {
      minHeight: 44,
      alignSelf: "flex-start",
      justifyContent: "center",
      paddingHorizontal: t.spacing.sm,
      marginLeft: -t.spacing.sm,
    },
    choiceSetupActionLabel: {
      color: t.colors.primary,
      fontFamily: fontFamilies.medium,
    },
    choiceInputError: {
      color: t.colors.error,
    },
    summaryBlocker: {
      gap: t.spacing.xs,
      padding: t.spacing.md,
      borderRadius: ROUNDED_SURFACE_RADIUS,
      backgroundColor: t.colors.background,
    },
    summaryBlockerMessage: {
      color: t.colors.error,
    },
    summaryBlockerAction: {
      minHeight: 44,
      alignSelf: "flex-start",
      justifyContent: "center",
    },
    summaryBlockerActionLabel: {
      color: t.colors.primary,
      fontFamily: fontFamilies.medium,
    },
    summaryFeedback: {
      marginHorizontal: t.spacing.md,
      minHeight: 60,
      padding: 12,
      borderRadius: t.glass.radius.surface,
      backgroundColor: t.colors.background,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    summaryFeedbackIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    summaryFeedbackContent: {
      flex: 1,
      gap: t.spacing.xs,
    },
    summaryFeedbackTitle: {
      fontFamily: fontFamilies.medium,
    },
    summaryFeedbackMessage: {
      color: t.colors.textMedium,
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
      borderRadius: t.borders.md,
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
      borderColor: SOFT_BORDER_COLOR,
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
    datePickerSheet: {
      width: "100%",
      maxWidth: 420,
      alignSelf: "center",
      overflow: "hidden",
      ...createRoundedSurfaceStyle(t),
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
      paddingBottom: t.spacing.sm,
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
      borderColor: SOFT_BORDER_COLOR,
      paddingHorizontal: t.spacing.sm,
    },
    summaryActionButtonSingle: {
      flex: 0,
      width: "100%",
    },
    summaryActionLabel: {},
    helperContentScroll: {
      borderRadius: ROUNDED_SURFACE_RADIUS,
    },
    helperContentScrollContent: {},
    helperSectionsList: {
      gap: 0,
      overflow: "hidden",
      ...createRoundedSurfaceStyle(t),
    },
    helperSectionBlock: {},
    helperSectionHeader: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.md,
      paddingHorizontal: t.spacing.md,
    },
    helperSectionAnswer: {
      paddingBottom: t.spacing.md,
      paddingRight: t.spacing.lg,
      paddingLeft: t.spacing.md,
    },
    helperSectionTitle: {
      flex: 1,
      minWidth: 0,
    },
    helperSectionSubtitle: {
      color: t.colors.textMedium,
    },
    helperBody: {
      color: t.colors.textMedium,
    },
    helperRowSeparator: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SOFT_SEPARATOR_COLOR,
    },
    helperOverlayBackdrop: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: t.spacing.sm,
      backgroundColor: "rgba(0,0,0,0.24)",
    },
    helperOverlaySheet: {
      width: "100%",
      maxWidth: 560,
    },
    profileSwitcherSection: {
      marginHorizontal: t.spacing.md,
      marginBottom: t.spacing.sm,
      overflow: "hidden",
    },
    profileSwitcherRow: {
      minHeight: 80,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
    },
    profileSwitcherRowActive: {},
    profileSwitcherAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: SOFT_BORDER_COLOR,
      backgroundColor: t.colors.backgroudWhite,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    profileSwitcherInitials: {
      color: t.colors.textDark,
    },
    profileSwitcherContent: {
      flex: 1,
      minWidth: 0,
      gap: t.spacing.xs,
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
      alignItems: "flex-start",
      gap: t.spacing.xs,
    },
    profileSwitcherMetaDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: t.colors.error,
      flexShrink: 0,
      marginTop: 5,
    },
    profileSwitcherMetaText: {
      color: t.colors.stateAnulated,
      flex: 1,
      minWidth: 0,
    },
    profileSwitcherSeparator: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: SOFT_SEPARATOR_COLOR,
      marginLeft: 72,
    },
    profileSwitcherAction: {
      minHeight: 56,
      paddingHorizontal: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.xs,
    },
    profileSwitcherActionText: {
      color: t.colors.primary,
    },
  };
}
