import GlassSurface from "@/src/components/glass/GlassSurface";
import { useTheme } from "@/src/themes/ThemeProvider";
import { usePathname } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NavbarItem from "./NavbarItem";
import { createNavbarStyles } from "./styles";
import {
  isEmailSetupAllowedTabPath,
  normalizeTabPath,
  useEmailSetupGate,
} from "./useEmailSetupGate";
import { useNavItems } from "./useNavItems";

export default function Navbar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const t = useTheme();
  const s = React.useMemo(() => createNavbarStyles(t), [t]);
  const items = useNavItems();
  const { isAccountSetupBlocked, isLoadingEmailSetupStatus } = useEmailSetupGate();
  const shouldRestrictTabs = isLoadingEmailSetupStatus || isAccountSetupBlocked;
  const bottomPadding =
    Platform.OS === "android" ? Math.max(insets.bottom + 8, 16) : insets.bottom + 8;

  const isActive = (href: string, path: string) => {
    const h = normalizeTabPath(href);
    const p = normalizeTabPath(path);
    return h === "/" ? p === "/" : p.startsWith(h);
  };

  return (
    <View style={[s.overlay, { paddingBottom: bottomPadding }]} accessibilityRole="tablist">
      <GlassSurface
        variant="nav"
        blur="nav"
        style={s.glass}
        clipStyle={s.glassClip}
        contentStyle={s.pill}
      >
        {items.map((it) => (
          <NavbarItem
            key={it.name}
            item={it}
            active={isActive(String(it.href), pathname)}
            disabled={shouldRestrictTabs && !isEmailSetupAllowedTabPath(String(it.href))}
          />
        ))}
      </GlassSurface>
    </View>
  );
}
