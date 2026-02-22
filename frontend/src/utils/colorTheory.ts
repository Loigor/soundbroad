/**
 * Color Theory Utilities for Soundbroad
 * Implements WCAG contrast ratios and color harmony calculations
 * No external dependencies - all calculations done in pure TypeScript
 */

const Charcoal = 'rgba(33, 36, 42, 1)';
const Whitesmoke = 'rgba(245, 245, 245, 1)';

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
  if (!bgColor) return Whitesmoke;

  const rgb = parseColor(bgColor);
  if (!rgb) return Whitesmoke;

  const bgLuminance = getLuminance(rgb[0], rgb[1], rgb[2]);
  const whiteLuminance = getLuminance(255, 255, 255);
  const blackLuminance = getLuminance(0, 0, 0);

  const contrastWhite = getContrastRatio(bgLuminance, whiteLuminance);
  const contrastBlack = getContrastRatio(bgLuminance, blackLuminance);

  return contrastBlack > contrastWhite ? Charcoal : Whitesmoke;
};

/**
 * Get a waveform color that visually contrasts with the background
 * while staying within the same hue family (e.g. orange bg → dark or light orange waveform).
 * Uses WCAG AA contrast threshold (4.5:1).
 */
export const getWaveformColor = (bgColor: string | null | undefined): string => {
  if (!bgColor) return '#2196f3';

  const rgb = parseColor(bgColor);
  if (!rgb) return '#2196f3';

  const bgLuminance = getLuminance(rgb[0], rgb[1], rgb[2]);
  const [h, s] = rgbToHsv(rgb[0], rgb[1], rgb[2]);

  const MIN_CONTRAST = 4.5; // WCAG AA
  const isLightBg = bgLuminance > 0.5;

  // Achromatic backgrounds have no meaningful hue; contrast with a plain gray.
  if (s < 15) {
    const contrastV = isLightBg ? 20 : 80;
    const [r, g, b] = hsvToRgb(0, 0, contrastV);
    return rgbToHex(r, g, b);
  }

  // Scan toward lighter tints of the same hue (high V, reduced S → pale version).
  const findLighterContrast = (): string | null => {
    for (let v = 80; v <= 100; v += 2) {
      const progress = (v - 80) / 20;
      const targetS = Math.max(20, s * (1 - progress * 0.6));
      const candidate = hsvToRgb(h, targetS, v);
      if (getContrastRatio(bgLuminance, getLuminance(...candidate)) >= MIN_CONTRAST) {
        return rgbToHex(...candidate);
      }
    }
    return null;
  };

  // Scan toward darker shades of the same hue (low V, boosted S → rich dark version).
  const findDarkerContrast = (): string | null => {
    for (let v = 45; v >= 0; v -= 2) {
      const targetS = Math.min(100, s + (45 - v) * 0.4);
      const candidate = hsvToRgb(h, targetS, v);
      if (getContrastRatio(bgLuminance, getLuminance(...candidate)) >= MIN_CONTRAST) {
        return rgbToHex(...candidate);
      }
    }
    return null;
  };

  const result = isLightBg
    ? (findDarkerContrast() ?? findLighterContrast())
    : (findLighterContrast() ?? findDarkerContrast());

  if (result) return result;

  // Fallback: push to the extreme of the hue family for guaranteed contrast.
  const [fr, fg, fb] = hsvToRgb(h, Math.min(s + 20, 100), isLightBg ? 10 : 95);
  return rgbToHex(fr, fg, fb);
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
