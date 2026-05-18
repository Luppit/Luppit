import GlassSurface from "@/src/components/glass/GlassSurface";
import { useTheme } from "@/src/themes/ThemeProvider";
import { usePathname } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NavbarItem from "./NavbarItem";
import { createNavbarStyles } from "./styles";
import { useNavItems } from "./useNavItems";

export default function Navbar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const t = useTheme();
  const s = React.useMemo(() => createNavbarStyles(t), [t]);
  const items = useNavItems();

  const isActive = (href: string, path: string) => {
    const stripGroups = (p: string) => p.replace(/\([^/]+\)\//g, "");
    const h = stripGroups(href);
    return h === "/" ? path === "/" : path.startsWith(h);
  };

  return (
    <View style={[s.overlay, { paddingBottom: insets.bottom + 8 }]} accessibilityRole="tablist">
      <GlassSurface
        variant="nav"
        blur="nav"
        style={s.glass}
        clipStyle={s.glassClip}
        contentStyle={s.pill}
      >
        {items.map((it) => (
          <NavbarItem key={it.name} item={it} active={isActive(String(it.href), pathname)} />
        ))}
      </GlassSurface>
    </View>
  );
}
