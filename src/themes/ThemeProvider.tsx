import { createKVStorage } from "@/src/store/factory";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Appearance, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { borders } from "./borders";
import { colors, darkColors } from "./colors";
import { fontSizes, lineHeights } from "./fontScale";
import { glass, darkGlass } from "./glass";
import { spacing } from "./spacing";
import { typography } from "./typography";

export type Theme = {
  colorScheme: "light" | "dark";
  colors: typeof colors;
  spacing: typeof spacing;
  typography: typeof typography;
  fontSizes: typeof fontSizes;
  lineHeights: typeof lineHeights;
  borders: typeof borders;
  glass: typeof glass;
};

const defaultTheme: Theme = {
  colorScheme: "light",
  colors,
  spacing,
  typography,
  fontSizes,
  lineHeights,
  borders,
  glass
};

const ThemeCtx = createContext<Theme>(defaultTheme);
const darkTheme: Theme = { ...defaultTheme, colorScheme: "dark", colors: darkColors, glass: darkGlass };

export type AppearanceMode = "light" | "dark" | "system";
const APPEARANCE_MODE_KEY = "appearance_mode";
const storage = createKVStorage();
const AppearanceCtx = createContext<{
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => Promise<void>;
}>({ mode: "light", setMode: async () => {} });

export const useTheme = () => useContext(ThemeCtx);
export const useAppearance = () => useContext(AppearanceCtx);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useColorScheme();
  const [mode, setMode] = useState<AppearanceMode | null>(null);

  useEffect(() => {
    let active = true;
    void storage.getItem(APPEARANCE_MODE_KEY).then((savedMode) => {
      if (active) setMode(savedMode === "light" || savedMode === "dark" || savedMode === "system" ? savedMode : "light");
    }).catch(() => {
      if (active) setMode("light");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mode !== null) Appearance.setColorScheme?.(mode === "system" ? null : mode);
  }, [mode]);

  const changeMode = useCallback(async (nextMode: AppearanceMode) => {
    await storage.setItem(APPEARANCE_MODE_KEY, nextMode);
    setMode(nextMode);
  }, []);

  if (mode === null) return null;
  const isDark = (mode === "system" ? colorScheme : mode) === "dark";
  return (
    <ThemeCtx.Provider value={isDark ? darkTheme : defaultTheme}>
      <AppearanceCtx.Provider value={{ mode, setMode: changeMode }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        {children}
      </AppearanceCtx.Provider>
    </ThemeCtx.Provider>
  );
};
