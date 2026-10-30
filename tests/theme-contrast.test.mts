import assert from "node:assert/strict";
import test from "node:test";
import { colors, darkColors } from "../src/themes/colors.ts";

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const [appearance, palette] of Object.entries({ light: colors, dark: darkColors })) {
  test(`${appearance} reading and interactive text meets 4.5:1 on app surfaces`, () => {
    for (const foreground of ["textDark", "textMedium", "textMuted", "primary"] as const) {
      for (const background of ["background", "backgroudWhite"] as const) {
        assert.ok(contrast(palette[foreground], palette[background]) >= 4.5,
          `${appearance}: ${foreground} on ${background}`);
      }
    }
    assert.ok(contrast(palette.backgroudWhite, palette.primary) >= 4.5);
    assert.ok(contrast(palette.primary, palette.primaryLight) >= 4.5);
  });
}
