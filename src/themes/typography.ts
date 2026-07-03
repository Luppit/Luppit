import { fontSizes, lineHeights } from "./fontScale";

export const fontFamilies = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
} as const;

export type TextVariant =
  | "title"
  | "subtitle"
  | "body"
  | "small"
  | "price";

export const typography: Record<TextVariant, {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}> = {
  title:    { fontFamily: fontFamilies.semibold, fontSize: fontSizes.xl, lineHeight: lineHeights.xl },
  subtitle: { fontFamily: fontFamilies.semibold,   fontSize: fontSizes.lg, lineHeight: lineHeights.lg },
  body:     { fontFamily: fontFamilies.regular,  fontSize: fontSizes.md, lineHeight: lineHeights.md },
  small:    { fontFamily: fontFamilies.regular,  fontSize: fontSizes.sm, lineHeight: lineHeights.sm },
  price:    { fontFamily: fontFamilies.semibold, fontSize: fontSizes.xxl, lineHeight: lineHeights.xxl },
};
