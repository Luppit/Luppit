import {
  ArrowRight,
  Check,
  CirclePlus,
  Heart,
  House,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Smartphone,
  Trash2,
  User,
  X
} from "lucide-react-native";

export const lucideIcons = {
  heart: Heart,
  check: Check,
  x: X,
  "arrow-right": ArrowRight,
  "trash-2": Trash2,
  plus: Plus,
  search: Search,
  smartphone: Smartphone,
  house: House,
  "message-circle": MessageCircle,
  user: User,
  "circle-plus": CirclePlus,
  "message-square": MessageSquare,
} as const;

export type LucideIconName = keyof typeof lucideIcons;



