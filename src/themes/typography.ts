import { fontSizes, lineHeights } from "./fontScale";

export const fontFamilies = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
} as const;

export type TextVariant = "title" | "subtitle" | "body" | "label" | "caption";

export const typography: Record<TextVariant, {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}> = {
  title:    { fontFamily: fontFamilies.semibold, fontSize: fontSizes.xl, lineHeight: lineHeights.xl },
  subtitle: { fontFamily: fontFamilies.medium,   fontSize: fontSizes.lg, lineHeight: lineHeights.lg },
  body:     { fontFamily: fontFamilies.regular,  fontSize: fontSizes.md, lineHeight: lineHeights.md },
  label:    { fontFamily: fontFamilies.semibold, fontSize: fontSizes.sm, lineHeight: lineHeights.sm },
  caption:  { fontFamily: fontFamilies.regular,  fontSize: fontSizes.xs, lineHeight: lineHeights.xs, letterSpacing: 0.2 },
};
