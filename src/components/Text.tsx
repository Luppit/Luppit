import { TextVariant, useTheme, type Theme } from "@/src/themes";
import React from "react";
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from "react-native";

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: keyof Theme["colors"];      
  align?: "left" | "center" | "right";
  maxLines?: number;
};

export const Text: React.FC<TextProps> = ({
  variant = "body",
  color = "textDark",
  align = "left",
  maxLines,
  style,
  children,
  ...rest
}) => {
  const theme = useTheme();
  const v = theme.typography[variant];

  return (
    <RNText
      {...rest}
      numberOfLines={maxLines}
      style={StyleSheet.flatten([
        { color: theme.colors[color], textAlign: align },
        v,           
        style,
      ])}
      allowFontScaling
      maxFontSizeMultiplier={1.3}
    >
      {children}
    </RNText>
  );
};
