import type { BlurTint } from "expo-blur";
import { Platform, ViewStyle } from "react-native";

function createShadow(
  color: string,
  offset: { width: number; height: number },
  radius: number,
  elevation: number
) {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOpacity: 1,
      shadowOffset: offset,
      shadowRadius: radius,
    },
    android: {
      elevation,
    },
    default: {
      shadowColor: color,
      shadowOpacity: 1,
      shadowOffset: offset,
      shadowRadius: radius,
    },
  }) ?? {};
}

const edge = {
  borderWidth: 1,
  borderColor: "rgba(221,221,221,0.62)",
  borderTopColor: "rgba(255,255,255,0.96)",
  borderLeftColor: "rgba(255,255,255,0.82)",
  borderRightColor: "rgba(221,221,221,0.54)",
  borderBottomColor: "rgba(221,221,221,0.68)",
} satisfies ViewStyle;

const contentShadow = createShadow("rgba(2,6,23,0.08)", { width: 0, height: 2 }, 7, 2);
const chromeShadow = createShadow("rgba(2,6,23,0.1)", { width: 0, height: 8 }, 18, 5);
const sheetShadow = createShadow("rgba(2,6,23,0.16)", { width: 0, height: -3 }, 18, 8);
const activeSegmentShadow = createShadow("rgba(2,6,23,0.07)", { width: 0, height: 1 }, 3, 1);

export const glass = {
  surface: {
    backgroundColor: "rgba(248,252,255,0.72)",
    ...edge,
    ...contentShadow,
  } satisfies ViewStyle,
  chrome: {
    backgroundColor: "rgba(255,255,255,0.14)",
    ...edge,
    borderColor: "rgba(255,255,255,0.4)",
    borderBottomColor: "rgba(180,190,200,0.28)",
    ...chromeShadow,
  } satisfies ViewStyle,
  nav: {
    backgroundColor: "rgba(255,255,255,0.24)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    borderBottomColor: "rgba(148,163,184,0.28)",
    ...chromeShadow,
  } satisfies ViewStyle,
  sheet: {
    backgroundColor: "rgba(255,255,255,0.94)",
    ...edge,
    borderColor: "rgba(221,221,221,0.66)",
    borderBottomColor: "rgba(255,255,255,0.94)",
    ...sheetShadow,
  } satisfies ViewStyle,
  chip: {
    backgroundColor: "rgba(248,252,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(221,221,221,0.56)",
    borderTopColor: "rgba(255,255,255,0.84)",
  } satisfies ViewStyle,
  control: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
    borderTopColor: "rgba(255,255,255,0.72)",
  } satisfies ViewStyle,
  headerControl: {
    backgroundColor: "rgba(255,255,255,0.26)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.34)",
  } satisfies ViewStyle,
  segmentActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    ...activeSegmentShadow,
  } satisfies ViewStyle,
  topHighlight: {
    position: "absolute",
    left: 8,
    top: 4,
    width: "84%",
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.42)",
    opacity: 0.78,
  } satisfies ViewStyle,
  radius: {
    surface: 24,
    chrome: 34,
    sheet: 24,
    chip: 999,
    control: 18,
    nav: 40,
  },
  blurIntensity: {
    nav: 14,
    chrome: 20,
    surface: 8,
    sheet: 18,
    control: 10,
  },
  blurTint: {
    nav: "default",
    chrome: "default",
    surface: "light",
    sheet: "systemMaterialLight",
    control: "systemUltraThinMaterialLight",
  } satisfies Record<"nav" | "chrome" | "surface" | "sheet" | "control", BlurTint>,
} as const;
