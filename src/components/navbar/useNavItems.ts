import { LucideIconName, lucideIcons } from "@/src/icons/lucide";
import { getCurrentUserNavbarItems } from "@/src/services/navbar.service";
import { type Href } from "expo-router";
import React from "react";

export type NavName = string;

export type NavItem = {
  name: NavName;
  label: string;
  href: Href;
  icon?: LucideIconName;
};

function isLucideIconName(icon: string): icon is LucideIconName {
  return icon in lucideIcons;
}

export const useNavItems = (): NavItem[] => {
  const [items, setItems] = React.useState<NavItem[]>([]);

  React.useEffect(() => {
    let active = true;

    setItems([]);

    const loadFromDb = async () => {
      const result = await getCurrentUserNavbarItems();
      if (!active || !result.ok) {
        setItems([]);
        return;
      }

      const mappedItems: NavItem[] = result.data.map((item) => ({
        name: item.menuCode,
        label: item.label,
        href: item.route as Href,
        icon: isLucideIconName(item.icon) ? item.icon : undefined,
      }));

      setItems(mappedItems);
    };

    void loadFromDb();

    return () => {
      active = false;
    };
  }, []);

  return items;
};
