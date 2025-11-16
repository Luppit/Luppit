import { useTheme } from "@/src/themes/ThemeProvider";
import { BlurView } from "expo-blur";
import { usePathname } from "expo-router";
import React from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NavbarItem from "./NavbarItem";
import { createNavbarStyles } from "./styles";
import { useNavItems } from "./useNavItems";

export default function Navbar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const t = useTheme();
  const colorScheme = useColorScheme();
  const s = React.useMemo(() => createNavbarStyles(t), [t]);
  const items = useNavItems();

  // stripGroups/isActive como en tu código (omitir aquí por brevedad)
  const isActive = (href: string, path: string) => {
    const stripGroups = (p: string) => p.replace(/\([^/]+\)\//g, "");
    const h = stripGroups(href);
    return h === "/" ? path === "/" : path.startsWith(h);
  };
  

  return (
    <View style={[s.overlay, { paddingBottom: insets.bottom + 8 }]} accessibilityRole="tablist">
      <BlurView
        intensity={5}                 // aumenta para un blur más marcado
        tint={colorScheme === "dark" ? "dark" : "light"}
        style={s.glass}
      >
      
        {/* top highlight: brillo superior (dentro del blur, para que recorte con overflow) */}
        <View pointerEvents="none" style={s.pillTopHighlight} />

        {/* pill: contenido semi-transparente + borde + sombra */}
        <View style={s.pill}>
          {items.map((it) => (
            <NavbarItem key={it.name} item={it} active={isActive(String(it.href), pathname)} />
          ))}
        </View>
      </BlurView>
    </View>
  );
}