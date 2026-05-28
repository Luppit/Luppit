import { Theme } from "@/src/themes";
import { StyleSheet } from "react-native";

export const createNavbarStyles = (t: Theme) => {
  const COLORS = {
    active: t.colors.success ?? "#8AAE4D",
    text: t.colors.textDark ?? "#111",
    ripple: t.colors.ripple ?? "rgba(0,0,0,0.08)",
  };

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      paddingHorizontal: 16,
    },

    // GlassSurface owns the material and shadow; clipping lives on glassClip.
    glass: {
      width: "100%",
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
      height: 65,
      justifyContent: "space-between",
      alignItems: "center",
      columnGap: 6,
      paddingHorizontal: 18,
    },

    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
    },
    itemInner: {
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    label: { fontSize: 13, color: COLORS.text, fontWeight: "500", fontFamily: t.typography.caption.fontFamily },
    labelActive: { color: COLORS.active, fontWeight: "700" },
  });

  return { ...styles, _colors: COLORS };
};
