import GlassSurface from "@/src/components/glass/GlassSurface";
import {
  clearToastBottomInset,
  setToastBottomInset,
} from "@/src/services/toast.service";
import { useTheme } from "@/src/themes/ThemeProvider";
import { usePathname } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NavbarItem from "./NavbarItem";
import { createNavbarStyles, NAVBAR_HEIGHT } from "./styles";
import {
  isAccountSetupAllowedTabPath,
  normalizeTabPath,
  useAccountSetupGate,
} from "./useEmailSetupGate";
import { useNavItems } from "./useNavItems";

const TOAST_INSET_SOURCE = "navbar";

export default function Navbar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const t = useTheme();
  const s = React.useMemo(() => createNavbarStyles(t), [t]);
  const items = useNavItems();
  const { isAccountSetupBlocked, isLoadingAccountSetupStatus } = useAccountSetupGate();
  const shouldRestrictTabs = isLoadingAccountSetupStatus || isAccountSetupBlocked;
  const bottomOffset = Math.max(insets.bottom, Platform.OS === "android" ? 10 : 12);

  React.useEffect(() => {
    setToastBottomInset(
      TOAST_INSET_SOURCE,
      bottomOffset + NAVBAR_HEIGHT + t.spacing.sm
    );

    return () => clearToastBottomInset(TOAST_INSET_SOURCE);
  }, [bottomOffset, t.spacing.sm]);

  const isActive = (href: string, path: string) => {
    const h = normalizeTabPath(href);
    const p = normalizeTabPath(path);
    return h === "/" ? p === "/" : p.startsWith(h);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[s.overlay, { bottom: bottomOffset }]}
      accessibilityRole="tablist"
    >
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
            disabled={shouldRestrictTabs && !isAccountSetupAllowedTabPath(String(it.href))}
          />
        ))}
      </GlassSurface>
    </View>
  );
}
