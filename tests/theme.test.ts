import { describe, it, expect } from "vitest";

// sRGB to linear luminance helper per WCAG 2.1 specs
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Theme Colors & WCAG AA Contrast Compliance", () => {
  const lightBg = "#f6f5f2"; // Warm bone
  const lightSurface = "#fffefb"; // Pure surface
  const lightFg = "#1e2124"; // Near-black charcoal
  const lightMuted = "#4e555e"; // Secondary text
  const lightSubtle = "#6c737c"; // Subtle / placeholder text
  const lightAccentText = "#007369"; // High-contrast teal text
  const vibrantAccent = "#00b8a9"; // Button fill teal

  it("ensures primary text passes WCAG AAA (>= 7:1) on light surfaces", () => {
    const ratioBg = getContrastRatio(lightFg, lightBg);
    const ratioSurface = getContrastRatio(lightFg, lightSurface);
    expect(ratioBg).toBeGreaterThanOrEqual(7.0);
    expect(ratioSurface).toBeGreaterThanOrEqual(7.0);
  });

  it("ensures muted text passes WCAG AA (>= 4.5:1) for body copy", () => {
    const ratioBg = getContrastRatio(lightMuted, lightBg);
    const ratioSurface = getContrastRatio(lightMuted, lightSurface);
    expect(ratioBg).toBeGreaterThanOrEqual(4.5);
    expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
  });

  it("ensures subtle text passes WCAG AA (>= 4.5:1) on card surfaces", () => {
    const ratioSurface = getContrastRatio(lightSubtle, lightSurface);
    expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
  });

  it("ensures accent text passes WCAG AA (>= 4.5:1) on white and bone backgrounds", () => {
    const ratioBg = getContrastRatio(lightAccentText, lightBg);
    const ratioSurface = getContrastRatio(lightAccentText, lightSurface);
    expect(ratioBg).toBeGreaterThanOrEqual(4.5);
    expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
  });

  it("verifies why standard vibrant teal #00b8a9 must not be used for small body text", () => {
    // #00b8a9 only reaches ~2.5:1 on light backgrounds, failing WCAG AA (requires 4.5:1)
    const failRatio = getContrastRatio(vibrantAccent, lightSurface);
    expect(failRatio).toBeLessThan(4.5);

    // But button fills (charcoal text on vibrant teal) pass with high contrast >= 4.5:1
    const buttonRatio = getContrastRatio(lightFg, vibrantAccent);
    expect(buttonRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("ensures dark mode text colors pass WCAG AA on dark backgrounds", () => {
    const darkBg = "#0c0e12";
    const darkFg = "#f4f6f8";
    const darkMuted = "#9aa2ac";
    const darkAccent = "#00b8a9";

    expect(getContrastRatio(darkFg, darkBg)).toBeGreaterThanOrEqual(7.0);
    expect(getContrastRatio(darkMuted, darkBg)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(darkAccent, darkBg)).toBeGreaterThanOrEqual(4.5);
  });

  it("ensures hero italic gradient text (monolithic balance) passes WCAG AA in light mode", () => {
    const lightGradientStart = "#18181b"; // zinc-900
    const lightGradientMid = "#27272a"; // zinc-800
    const lightGradientEnd = "#007369"; // high-contrast teal

    expect(getContrastRatio(lightGradientStart, lightBg)).toBeGreaterThanOrEqual(7.0);
    expect(getContrastRatio(lightGradientMid, lightBg)).toBeGreaterThanOrEqual(7.0);
    expect(getContrastRatio(lightGradientEnd, lightBg)).toBeGreaterThanOrEqual(4.5);
  });
});
