import React, { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { borders } from "./borders";
import { colors, darkColors } from "./colors";
import { fontSizes, lineHeights } from "./fontScale";
import { glass, darkGlass } from "./glass";
import { spacing } from "./spacing";
import { typography } from "./typography";

export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  typography: typeof typography;
  fontSizes: typeof fontSizes;
  lineHeights: typeof lineHeights;
  borders: typeof borders;
  glass: typeof glass;
};

const defaultTheme: Theme = {
  colors,
  spacing,
  typography,
  fontSizes,
  lineHeights,
  borders,
  glass
};

const ThemeCtx = createContext<Theme>(defaultTheme);
const darkTheme: Theme = { ...defaultTheme, colors: darkColors, glass: darkGlass };

export const useTheme = () => useContext(ThemeCtx);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const isDark = useColorScheme() === "dark";
  return (
    <ThemeCtx.Provider value={isDark ? darkTheme : defaultTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </ThemeCtx.Provider>
  );
};
