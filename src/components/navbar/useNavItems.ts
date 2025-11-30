import { LucideIconName } from "@/src/icons/lucide";
import { type Href } from "expo-router";
import React from "react";

export type NavName = "home" | "create" | "favorites" | "chats" | "profile";

export type NavItem = {
  name: NavName;
  label: string;
  href: Href;              
  icon: LucideIconName;    
};

// Mapea a los nombres que soporte tu <Icon />
export const useNavItems = (): NavItem[] =>
  React.useMemo(
    () => [
      { name: "home",      label: "Inicio",    href: "/",                 icon: "home-pin" },
      { name: "create",    label: "Crear",     href: "/(tabs)/create",    icon: "circle-plus" },
      { name: "favorites", label: "Favoritas", href: "/(tabs)/favorites", icon: "heart" },
      { name: "chats",     label: "Chats",     href: "/(tabs)/chats",     icon: "message-square" },
      { name: "profile",   label: "Perfil",    href: "/(tabs)/profile",   icon: "user" },
    ],
    []
  );