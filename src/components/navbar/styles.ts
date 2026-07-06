import { Theme } from "@/src/themes";
import { StyleSheet } from "react-native";

export const createNavbarStyles = (t: Theme) => {
  const COLORS = {
    active: t.colors.primary ?? "#83A31E",
    disabled: t.colors.IconColorGray ?? "#BBBBBB",
    text: t.colors.textDark ?? "#111",
    ripple: t.colors.ripple ?? "rgba(0,0,0,0.08)",
  };

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      paddingHorizontal: t.spacing.md,
    },

    // GlassSurface owns the material and shadow; clipping lives on glassClip.
    glass: {
      width: "100%",
      maxWidth: 430,
      borderRadius: t.glass.radius.nav,
      alignItems: "center",
      justifyContent: "center",
    },
    glassClip: {
      borderRadius: t.glass.radius.nav,
      overflow: "hidden",
    },

    pill: {
      flexDirection: "row",
      width: "100%",
      height: 66,
      justifyContent: "space-between",
      alignItems: "center",
      columnGap: 0,
      paddingHorizontal: 6,
    },

    item: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      borderRadius: 33,
      overflow: "hidden",
    },
    itemInner: {
      width: 64,
      maxWidth: "96%",
      height: 58,
      paddingHorizontal: 2,
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      borderRadius: 29,
    },
    itemInnerActive: {
      width: 70,
      maxWidth: "100%",
      height: 62,
      borderRadius: 31,
      backgroundColor: "rgba(241,245,246,0.88)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.72)",
    },
    itemInnerDisabled: {
      opacity: 0.48,
    },
    iconSlot: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      width: "100%",
      minWidth: 0,
      minHeight: 15,
      paddingHorizontal: 1,
      color: COLORS.text,
      textAlign: "center",
      fontSize: 12,
      lineHeight: 15,
      includeFontPadding: false,
    },
    labelActive: { color: COLORS.active },
    labelDisabled: { color: COLORS.disabled },
  });

  return { ...styles, _colors: COLORS };
};
