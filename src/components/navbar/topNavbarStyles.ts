import { Theme } from "@/src/themes";
import { Platform, StyleSheet } from "react-native";

export const createTopNavbarStyles = (t: Theme, topInset = 0) => {
  return StyleSheet.create({
    container: {
      flexShrink: 0,
      zIndex: 10,
      elevation: Platform.OS === "android" ? 4 : 10,
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
      paddingTop: topInset + t.spacing.sm,
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.sm,
      gap: t.spacing.sm,
    },
    profileIdentity: {
      gap: t.spacing.xs,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.xs,
    },
    profileSubtitle: {
      maxWidth: "100%",
    },
    profileName: {
      flex: 1,
      minWidth: 0,
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
      color: t.colors.textMuted,
    },
    searchTriggerDisabled: {
      opacity: 0.45,
    },
    activeFilterChip: {
      alignSelf: "flex-start",
    },
    categoryListContainer: {
      paddingRight: t.spacing.sm,
      gap: t.spacing.md,
    },
    categoryButton: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 60,
      minHeight: 54,
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
    categoryImageContainer: {
      width: 28,
      height: 28,
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
    categoryLabelSelected: {
      fontFamily: t.typography.subtitle.fontFamily,
    },
  });
};
