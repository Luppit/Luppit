import { Theme } from "@/src/themes"; // ajusta si tu tipo Theme vive en otra ruta
import { Platform, StyleSheet } from "react-native";

export const createNavbarStyles = (t: Theme) => {
  const COLORS = {
    active: t.colors.success ?? "#8AAE4D",
    text: t.colors.textDark ?? "#111",
    bg: t.colors.background ?? "#fff",
    shadow: t.colors.shadow ?? "#000",
    ripple: t.colors.ripple ?? "rgba(0,0,0,0.10)",
  };

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      left: 0, right: 0, bottom: 0,
      alignItems: "center",
      paddingHorizontal: 16,
    },
    pill: {
      flexDirection: "row",
      backgroundColor: COLORS.bg,
      borderRadius: 40,
      paddingVertical: 12,
      paddingHorizontal: 20,
      width: "100%",
      justifyContent: "space-between",
      ...Platform.select({
        ios: {
          shadowColor: COLORS.shadow,
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16
        },
        android: { elevation: 6 },
      }),
    },
    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      paddingVertical: 6,
    },
    itemInner: {
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    label: { fontSize: 13, color: COLORS.text, fontWeight: "500" },
    labelActive: { color: COLORS.active, fontWeight: "700" },
  });

  return { ...styles, _colors: COLORS };
};