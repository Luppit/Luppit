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
      shadowColor: color,
    },
    default: {
      shadowColor: color,
      shadowOpacity: 1,
      shadowOffset: offset,
      shadowRadius: radius,
    },
  }) ?? {};
}

function platformValue<T>(defaultValue: T, androidValue: T) {
  return Platform.OS === "android" ? androidValue : defaultValue;
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
const navShadow = createShadow("rgba(2,6,23,0.1)", { width: 0, height: 8 }, 18, 3);
const sheetShadow = createShadow("rgba(2,6,23,0.16)", { width: 0, height: -3 }, 18, 8);
const activeSegmentShadow = createShadow("rgba(2,6,23,0.07)", { width: 0, height: 1 }, 3, 1);

export const glass = {
  surface: {
    backgroundColor: platformValue("rgba(248,252,255,0.72)", "#F8FCFF"),
    ...edge,
    ...contentShadow,
  } satisfies ViewStyle,
  chrome: {
    backgroundColor: platformValue("rgba(255,255,255,0.14)", "#F9FAFB"),
    ...edge,
    borderColor: "rgba(255,255,255,0.4)",
    borderBottomColor: "rgba(180,190,200,0.28)",
    ...chromeShadow,
  } satisfies ViewStyle,
  nav: {
    backgroundColor: platformValue("rgba(255,255,255,0.24)", "#FFFFFF"),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    borderBottomColor: "rgba(148,163,184,0.28)",
    ...navShadow,
  } satisfies ViewStyle,
  sheet: {
    backgroundColor: platformValue("rgba(255,255,255,0.94)", "#FFFFFF"),
    ...edge,
    borderColor: "rgba(221,221,221,0.66)",
    borderBottomColor: "rgba(255,255,255,0.94)",
    ...sheetShadow,
  } satisfies ViewStyle,
  chip: {
    backgroundColor: platformValue("rgba(248,252,255,0.78)", "#F8FCFF"),
    borderWidth: 1,
    borderColor: "rgba(221,221,221,0.56)",
    borderTopColor: "rgba(255,255,255,0.84)",
  } satisfies ViewStyle,
  control: {
    backgroundColor: platformValue("rgba(240,244,248,0.56)", "#F5F7F9"),
    borderWidth: 1,
    borderColor: "rgba(221,221,221,0.44)",
    borderTopColor: "rgba(255,255,255,0.88)",
    ...contentShadow,
  } satisfies ViewStyle,
  headerControl: {
    backgroundColor: platformValue("rgba(255,255,255,0.26)", "#FFFFFF"),
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.34)",
    borderCurve: "continuous",
  } satisfies ViewStyle,
  segmentActive: {
    backgroundColor: platformValue("rgba(255,255,255,0.64)", "#FFFFFF"),
    borderWidth: 1,
    borderColor: "rgba(221,221,221,0.46)",
    borderTopColor: "rgba(255,255,255,0.92)",
    borderCurve: "continuous",
    ...activeSegmentShadow,
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

const darkEdge = {
  borderColor: "rgba(190,196,186,0.18)",
  borderTopColor: "rgba(220,224,216,0.16)",
  borderLeftColor: "rgba(220,224,216,0.12)",
  borderRightColor: "rgba(190,196,186,0.14)",
  borderBottomColor: "rgba(190,196,186,0.18)",
};

export const darkGlass: typeof glass = {
  ...glass,
  surface: { ...glass.surface, ...darkEdge, backgroundColor: "#252925" },
  chrome: { ...glass.chrome, ...darkEdge, backgroundColor: platformValue("rgba(28,32,28,0.88)", "#1C201C") },
  nav: { ...glass.nav, ...darkEdge, backgroundColor: platformValue("rgba(37,41,37,0.88)", "#252925") },
  sheet: { ...glass.sheet, ...darkEdge, backgroundColor: platformValue("rgba(45,50,45,0.96)", "#2D322D") },
  chip: { ...glass.chip, ...darkEdge, backgroundColor: "#303530" },
  control: { ...glass.control, ...darkEdge, backgroundColor: "#303530" },
  headerControl: { ...glass.headerControl, ...darkEdge, backgroundColor: "#303530" },
  segmentActive: { ...glass.segmentActive, ...darkEdge, backgroundColor: "#303A24" },
};
