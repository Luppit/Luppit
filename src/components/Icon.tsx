import { lucideIcons, type LucideIconName } from "@/src/icons/lucide";
import { useTheme } from "@/src/themes/ThemeProvider";
import React from "react";

type Props = {
  name: LucideIconName;  
  size?: number;
  color?: string;
  strokeWidth?: number;
  onPress?: () => void;
};

export function Icon({ name, size = 20, color, strokeWidth = 2, onPress }: Props) {
  const t = useTheme();
  const Cmp = lucideIcons[name];
  return <Cmp size={size} color={color ?? t.colors.textDark} strokeWidth={strokeWidth} onPress={onPress}/>;
}