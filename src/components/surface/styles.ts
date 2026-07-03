import { Theme } from "@/src/themes";
import { ViewStyle } from "react-native";

export const ROUNDED_SURFACE_RADIUS = 28;

export function createRoundedSurfaceStyle(t: Theme): ViewStyle {
  return {
    borderRadius: ROUNDED_SURFACE_RADIUS,
    backgroundColor: t.colors.backgroudWhite,
  };
}
