import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Plus,
  Search,
  Smartphone,
  Trash2,
  X,
} from "lucide-react-native";

export const lucideIcons = {
  heart: Heart,
  check: Check,
  x: X,
  "arrow-right": ArrowRight,
  "arrow-left": ArrowLeft,
  "trash-2": Trash2,
  plus: Plus,
  search: Search,
  smartphone: Smartphone,
} as const;

export type LucideIconName = keyof typeof lucideIcons;
