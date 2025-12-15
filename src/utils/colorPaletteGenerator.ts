/**
 * Color Palette Generator for Hierarchy
 * Purpose: Generate subtle color variations from a base subject color
 * Creates memory associations through visual distinction
 */

interface HSL {
  h: number;  // Hue (0-360)
  s: number;  // Saturation (0-100)
  l: number;  // Lightness (0-100)
}

/**
 * Convert HEX color to HSL
 */
export function hexToHSL(hex: string): HSL {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to HEX color
 */
export function hslToHex(h: number, s: number, l: number): string {
  // Normalize inputs
  h = h % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  
  const hueToRgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // Achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h / 360 + 1 / 3);
    g = hueToRgb(p, q, h / 360);
    b = hueToRgb(p, q, h / 360 - 1 / 3);
  }
  
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate color palette for hierarchy levels
 * Creates subtle variations that are visually related but distinguishable
 */
export function generateHierarchyPalette(baseColor: string): {
  level0: string[];  // For Level 0 topics (main sections)
  level1: string[];  // For Level 1 topics (sub-sections)
  level2: string[];  // For Level 2 topics (items)
} {
  const base = hexToHSL(baseColor);
  
  // Level 0: DRAMATIC lightness variations for clear distinction
  // Keeps hue the same, varies lightness significantly
  const level0Colors = [
    hslToHex(base.h, base.s, base.l),           // Original
    hslToHex(base.h, base.s + 10, base.l + 15), // Much lighter + more saturated
    hslToHex(base.h, base.s + 10, base.l - 15), // Much darker + more saturated
    hslToHex(base.h, base.s - 10, base.l + 12), // Lighter + desaturated
    hslToHex(base.h, base.s - 10, base.l - 12), // Darker + desaturated
    hslToHex(base.h + 5, base.s, base.l + 10),  // Slightly warmer + lighter
    hslToHex(base.h - 5, base.s, base.l + 10),  // Slightly cooler + lighter
  ];
  
  // Level 1: STRONG hue shifts for obvious distinction
  // Creates clearly different colors while staying in the same family
  const level1Colors = [
    hslToHex(base.h + 20, base.s, base.l + 8),   // Warm + lighter
    hslToHex(base.h - 20, base.s, base.l + 8),   // Cool + lighter
    hslToHex(base.h + 30, base.s - 8, base.l),   // Very warm
    hslToHex(base.h - 30, base.s - 8, base.l),   // Very cool
    hslToHex(base.h + 15, base.s + 5, base.l - 5), // Warm + saturated + darker
    hslToHex(base.h - 15, base.s + 5, base.l - 5), // Cool + saturated + darker
  ];
  
  // Level 2: Dramatic variations for sub-items
  const level2Colors = [
    hslToHex(base.h + 12, base.s - 10, base.l + 12),
    hslToHex(base.h - 12, base.s - 10, base.l + 12),
    hslToHex(base.h + 25, base.s - 15, base.l + 5),
    hslToHex(base.h - 25, base.s - 15, base.l + 5),
    hslToHex(base.h + 8, base.s + 5, base.l - 8),
    hslToHex(base.h - 8, base.s + 5, base.l - 8),
  ];
  
  return {
    level0: level0Colors,
    level1: level1Colors,
    level2: level2Colors,
  };
}

/**
 * Get color for a specific item in the hierarchy
 */
export function getHierarchyColor(
  baseColor: string,
  level: 0 | 1 | 2,
  index: number
): string {
  const palette = generateHierarchyPalette(baseColor);
  
  switch (level) {
    case 0:
      return palette.level0[index % palette.level0.length];
    case 1:
      return palette.level1[index % palette.level1.length];
    case 2:
      return palette.level2[index % palette.level2.length];
    default:
      return baseColor;
  }
}

/**
 * Generate lighter shade of a color (for backgrounds/tints)
 */
export function lightenColor(color: string, amount: number = 20): string {
  const hsl = hexToHSL(color);
  return hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + amount));
}

/**
 * Generate darker shade of a color
 */
export function darkenColor(color: string, amount: number = 20): string {
  const hsl = hexToHSL(color);
  return hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - amount));
}

/**
 * Add alpha transparency to hex color
 */
export function addAlpha(color: string, alpha: number): string {
  // alpha should be 0-1 (e.g., 0.1 for 10% opacity)
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${color}${alphaHex}`;
}
