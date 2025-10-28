import React, { createContext, useContext } from "react";
import { colors } from "./colors";
import { fontSizes, lineHeights } from "./fontScale";
import { spacing } from "./spacing";
import { typography } from "./typography";

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  typography: typeof typography;
  fontSizes: typeof fontSizes;
  lineHeights: typeof lineHeights;
};

const defaultTheme: Theme = {
  colors,
  spacing,
  typography,
  fontSizes,
  lineHeights,
};

const ThemeCtx = createContext<Theme>(defaultTheme);

export const useTheme = () => useContext(ThemeCtx);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <ThemeCtx.Provider value={defaultTheme}>{children}</ThemeCtx.Provider>
);
