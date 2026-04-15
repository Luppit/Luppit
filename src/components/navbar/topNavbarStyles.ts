import { Theme } from "@/src/themes";
import { StyleSheet } from "react-native";

export const createTopNavbarStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: t.colors.background,
      paddingBottom: t.spacing.sm,
      gap: t.spacing.md,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    onlineDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: t.colors.error,
      marginLeft: 2,
    },
    searchInputContainer: {
      borderRadius: 999,
      height: 48,
      backgroundColor: t.colors.backgroudWhite,
      borderColor: t.colors.border,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    searchTrigger: {
      borderRadius: 999,
      minHeight: 48,
      backgroundColor: t.colors.backgroudWhite,
      borderWidth: 1,
      borderColor: t.colors.border,
      shadowColor: t.colors.shadow,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
      paddingHorizontal: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    searchTriggerText: {
      flex: 1,
      color: t.colors.stateAnulated,
    },
    activeFilterChip: {
      alignSelf: "flex-start",
      minHeight: 36,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.backgroudWhite,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
      paddingLeft: t.spacing.sm,
      paddingRight: t.spacing.xs,
    },
    activeFilterChipLabel: {
      color: t.colors.textDark,
    },
    activeFilterChipClose: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryListContainer: {
      paddingRight: t.spacing.sm,
      gap: t.spacing.lg,
    },
    categoryButton: {
      alignItems: "center",
      paddingBottom: t.spacing.xs,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
      minWidth: 54,
    },
    categoryButtonDisabled: {
      opacity: 0.45,
    },
    categoryButtonActive: {
      borderBottomColor: t.colors.textDark,
    },
    categoryImageContainer: {
      width: 34,
      height: 34,
      marginBottom: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryImage: {
      width: 34,
      height: 34,
      borderRadius: 8,
    },
  });
