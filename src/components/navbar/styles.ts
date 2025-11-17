 import { Theme } from "@/src/themes";
import { Platform, StyleSheet } from "react-native";

export const createNavbarStyles = (t: Theme) => {
  const COLORS = {
    active: t.colors.success ?? "#8AAE4D",
    text: t.colors.textDark ?? "#111",
    // nivel glass: muy transparente para que se vea claramente lo que está debajo
    bgGlass: "rgba(255,255,255,0.6)",     // controla cuán "blanco" es el vidrio
    borderGlass: "rgba(255,255,255,1)", // borde sutil
    topHighlight: "rgba(255,255,255,0.05)",// brillo superior
    shadow: "rgba(2,6,23,0.12)",          // halo muy suave
    ripple: t.colors.ripple ?? "rgba(0,0,0,0.08)",
  };

  const styles = StyleSheet.create({
    // posicion absoluto al fondo (sin fondo propio)
    overlay: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      paddingHorizontal: 16,
      // Sin backgroundColor aquí para ser 100% transparente
    },

    // Blur container (recorta con borderRadius)
    glass: {
      width: "100%",
      borderRadius: 40,
     overflow: "hidden", // importante: recorta el blur y el highlight
      alignItems: "center",
      justifyContent: "center",
    },

    // Contenido tipo "pill" (fondo translúcido + borde + sombra suave)
    pill: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",

      borderRadius: 40,
      paddingVertical: 12,
      paddingHorizontal: 18,

      backgroundColor: COLORS.bgGlass,
      borderWidth: 1,
      borderTopWidth: 1.5,
      borderRightWidth: 1.5,

      borderColor: COLORS.borderGlass,

      ...Platform.select({
        ios: {
          shadowColor: COLORS.shadow,
          shadowOpacity: 1,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 20,
        },
        android: { elevation: 6 },
      }),
    },

    // brillo sutil en la esquina superior izquierda para dar efecto vidrio
    pillTopHighlight: {
      position: "absolute",
      left: 8,
      top: 4,
      width: "84%",
      height: 6,
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      backgroundColor: COLORS.topHighlight,
      opacity: 0.6,
      transform: [{ translateY: -4 }],
      // baja opacidad si se ve muy marcado
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
    label: { fontSize: 13, color: COLORS.text, fontWeight: "500", fontFamily: t.typography.caption.fontFamily },
    labelActive: { color: COLORS.active, fontWeight: "700" },
  });

  return { ...styles, _colors: COLORS };
};