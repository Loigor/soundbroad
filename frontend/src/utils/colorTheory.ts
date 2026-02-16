/**
 * Color Theory Utilities for Soundbroad
 * Implements WCAG contrast ratios and color harmony calculations
 * No external dependencies - all calculations done in pure TypeScript
 */

/**
 * Convert hex color to RGB
 */
const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
};

/**
 * Calculate relative luminance (for WCAG contrast)
 */
const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculate WCAG contrast ratio
 */
const getContrastRatio = (lum1: number, lum2: number): number => {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Convert RGB to HSV
 */
const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  let s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, v * 100];
};

/**
 * Convert HSV to RGB
 */
const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  h = h / 360;
  s = s / 100;
  v = v / 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0,
    g = 0,
    b = 0;

  switch (i % 6) {
    case 0:
      [r, g, b] = [v, t, p];
      break;
    case 1:
      [r, g, b] = [q, v, p];
      break;
    case 2:
      [r, g, b] = [p, v, t];
      break;
    case 3:
      [r, g, b] = [p, q, v];
      break;
    case 4:
      [r, g, b] = [t, p, v];
      break;
    case 5:
      [r, g, b] = [v, p, q];
      break;
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
};

/**
 * Convert RGB to Hex
 */
const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

/**
 * Parse CSS color to RGB
 */
const parseColor = (color: string): [number, number, number] | null => {
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
    }
  }
  return null;
};

/**
 * Determine if a color is light or dark using perceptual lightness
 */
export const isLightColor = (color: string | null | undefined): boolean => {
  if (!color) return false;
  const rgb = parseColor(color);
  if (!rgb) return false;
  const luminance = getLuminance(rgb[0], rgb[1], rgb[2]);
  return luminance > 0.5;
};

/**
 * Get appropriate text color (foreground) for a background color
 * Uses contrast ratio calculations for accessibility (WCAG standards)
 */
export const getContrastTextColor = (bgColor: string | null | undefined): string => {
  if (!bgColor) return 'rgba(255, 255, 255, 0.87)';

  const rgb = parseColor(bgColor);
  if (!rgb) return 'rgba(255, 255, 255, 0.87)';

  const bgLuminance = getLuminance(rgb[0], rgb[1], rgb[2]);
  const whiteLuminance = getLuminance(255, 255, 255);
  const blackLuminance = getLuminance(0, 0, 0);

  const contrastWhite = getContrastRatio(bgLuminance, whiteLuminance);
  const contrastBlack = getContrastRatio(bgLuminance, blackLuminance);

  return contrastBlack > contrastWhite ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)';
};

/**
 * Get a complementary waveform color based on background
 * Uses color theory to pick a color that contrasts well visually
 */
export const getWaveformColor = (bgColor: string | null | undefined): string => {
  if (!bgColor) return 'rgba(33, 150, 243, 0.8)';

  const rgb = parseColor(bgColor);
  if (!rgb) return 'rgba(33, 150, 243, 0.8)';

  const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  const luminance = getLuminance(rgb[0], rgb[1], rgb[2]);

  // Calculate complementary hue
  const complementaryHue = (h + 180) % 360;

  let waveformRgb: [number, number, number];

  if (luminance > 0.7) {
    // Light background - use darker, more saturated waveform
    waveformRgb = hsvToRgb(complementaryHue, 70, 60);
  } else if (luminance < 0.3) {
    // Dark background - use lighter, brighter waveform
    waveformRgb = hsvToRgb(complementaryHue, 40, 90);
  } else {
    // Mid-tone background
    const targetS = Math.min(100, s + 20);
    waveformRgb = hsvToRgb(complementaryHue, targetS, 80);
  }

  return rgbToHex(waveformRgb[0], waveformRgb[1], waveformRgb[2]);
};

/**
 * Get a highlighted/accent color for UI elements
 * Analogous color scheme - next to the waveform color on color wheel
 */
export const getAccentColor = (bgColor: string | null | undefined): string => {
  if (!bgColor) return 'rgba(76, 175, 80, 0.8)';

  const rgb = parseColor(bgColor);
  if (!rgb) return 'rgba(76, 175, 80, 0.8)';

  const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  const luminance = getLuminance(rgb[0], rgb[1], rgb[2]);

  // Get analogous hue (30 degrees away)
  const analogousHue = (h + 30) % 360;

  let accentRgb: [number, number, number];

  if (luminance > 0.7) {
    accentRgb = hsvToRgb(analogousHue, 70, 60);
  } else if (luminance < 0.3) {
    accentRgb = hsvToRgb(analogousHue, 40, 90);
  } else {
    const targetS = Math.min(100, s + 10);
    accentRgb = hsvToRgb(analogousHue, targetS, 80);
  }

  return rgbToHex(accentRgb[0], accentRgb[1], accentRgb[2]);
};

/**
 * Get a red/warning color that contrasts with background
 * Used for "near end" warnings on waveforms
 */
export const getWarningColor = (bgColor: string | null | undefined): string => {
  if (!bgColor) return 'rgba(255, 100, 100, 0.9)';

  const rgb = parseColor(bgColor);
  if (!rgb) return 'rgba(255, 100, 100, 0.9)';

  const luminance = getLuminance(rgb[0], rgb[1], rgb[2]);

  if (luminance > 0.6) {
    return 'rgba(199, 0, 0, 0.9)'; // Darker red on light bg
  } else if (luminance < 0.3) {
    return 'rgba(255, 100, 100, 0.9)'; // Brighter red on dark bg
  }

  return 'rgba(229, 57, 53, 0.9)'; // Medium red
};

/**
 * Get a semi-transparent background for the warning state
 */
export const getWarningBgColor = (bgColor: string | null | undefined): string => {
  if (!bgColor) return 'rgba(255, 100, 100, 0.15)';

  const rgb = parseColor(bgColor);
  if (!rgb) return 'rgba(255, 100, 100, 0.15)';

  const luminance = getLuminance(rgb[0], rgb[1], rgb[2]);

  if (luminance > 0.6) {
    return 'rgba(199, 0, 0, 0.15)';
  } else if (luminance < 0.3) {
    return 'rgba(255, 100, 100, 0.15)';
  }

  return 'rgba(229, 57, 53, 0.15)';
};

/**
 * Get primary UI color that works well with the background
 * Uses a triadic color scheme for variety
 */
export const getPrimaryColor = (bgColor: string | null | undefined): string => {
  if (!bgColor) return 'rgba(33, 150, 243, 0.8)';

  const rgb = parseColor(bgColor);
  if (!rgb) return 'rgba(33, 150, 243, 0.8)';

  const [h, s, v] = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  const luminance = getLuminance(rgb[0], rgb[1], rgb[2]);

  // Triadic hue (120 degrees away)
  const triadHue = (h + 120) % 360;

  let primaryRgb: [number, number, number];

  if (luminance > 0.7) {
    primaryRgb = hsvToRgb(triadHue, 70, 60);
  } else if (luminance < 0.3) {
    primaryRgb = hsvToRgb(triadHue, 40, 90);
  } else {
    const targetS = Math.min(100, s + 15);
    primaryRgb = hsvToRgb(triadHue, targetS, 80);
  }

  return rgbToHex(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
};
