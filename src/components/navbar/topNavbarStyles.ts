import { Theme } from "@/src/themes";
import { StyleSheet } from "react-native";

export const createTopNavbarStyles = (t: Theme, topInset = 0) => {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      zIndex: 10,
      elevation: 10,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: t.glass.radius.chrome,
      borderBottomRightRadius: t.glass.radius.chrome,
    },
    containerClip: {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: t.glass.radius.chrome,
      borderBottomRightRadius: t.glass.radius.chrome,
      overflow: "hidden",
    },
    containerContent: {
      paddingTop: topInset + t.spacing.lg,
      paddingHorizontal: t.spacing.xl,
      paddingBottom: t.spacing.md,
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
      ...t.glass.headerControl,
    },
    searchTrigger: {
      borderRadius: 999,
      minHeight: 48,
      ...t.glass.headerControl,
      paddingHorizontal: t.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    searchTriggerText: {
      flex: 1,
      color: t.colors.stateAnulated,
    },
    searchTriggerDisabled: {
      opacity: 0.45,
    },
    activeFilterChip: {
      alignSelf: "flex-start",
      minHeight: 36,
      borderRadius: 999,
      ...t.glass.chip,
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
      gap: t.spacing.md,
    },
    categoryButton: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 60,
      minHeight: 58,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: 2,
      borderRadius: 999,
    },
    categoryButtonDisabled: {
      opacity: 0.45,
    },
    categoryButtonActive: {
      transform: [{ translateY: -1 }],
    },
    categoryLabelActive: {
      fontFamily: t.typography.label.fontFamily,
      fontSize: t.typography.body.fontSize + 1,
      lineHeight: t.typography.body.lineHeight + 1,
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
    categoryImageActive: {
      transform: [{ scale: 1.12 }],
    },
  });
};
