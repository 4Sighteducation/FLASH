import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// FL4SH THEME SYSTEM v2.1 - REACT NATIVE COMPATIBLE
// ============================================================================
// Designed to work across iOS, Android, and Web
// Advanced effects are progressive enhancements (web-only or opt-in)
// ============================================================================

export type ThemeMode = 'cyber' | 'pulse' | 'aurora' | 'singularity';
export type ColorScheme = 'dark' | 'light';

// ============================================================================
// CORE COLOR INTERFACE - Works everywhere
// ============================================================================

interface ThemeColors {
  // Core palette
  primary: string;
  primaryMuted: string;
  secondary: string;
  secondaryMuted: string;
  tertiary: string;
  
  // Backgrounds
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceElevated: string;
  
  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  
  // Borders & Dividers
  border: string;
  borderSubtle: string;
  divider: string;
  
  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Glow colors (for shadows on RN, box-shadow on web)
  glowPrimary: string;
  glowSecondary: string;
  
  // BACKWARD COMPATIBILITY: Legacy gradient arrays
  gradient: readonly [string, string, string];
  cardGradient: readonly [string, string];
  buttonGradient: readonly [string, string];
  
  // Legacy single color for existing code
  accent: string;
}

// ============================================================================
// EFFECTS INTERFACE - Platform-aware
// ============================================================================

interface ThemeEffects {
  // Border radius - works everywhere
  radiusSmall: number;
  radiusMedium: number;
  radiusLarge: number;
  radiusXLarge: number;
  radiusFull: number;
  
  // Shadow configs - React Native compatible (iOS shadowX, Android elevation)
  shadow: {
    small: ShadowConfig;
    medium: ShadowConfig;
    large: ShadowConfig;
    glow: ShadowConfig;
  };
  
  // Animation timings (ms) - use with Animated API or reanimated
  timing: {
    fast: number;
    medium: number;
    slow: number;
    dramatic: number;
  };
  
  // Simple animation flags - implement with Animated/reanimated
  animations: {
    pulseEnabled: boolean;
    pulseScale: number;        // e.g., 1.02 for subtle, 1.05 for dramatic
    pulseDuration: number;     // ms
    glowEnabled: boolean;
    glowIntensity: number;     // 0-1 multiplier for shadow opacity
    floatEnabled: boolean;
    floatDistance: number;     // pixels
  };
}

// React Native compatible shadow config
interface ShadowConfig {
  // iOS
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  // Android
  elevation: number;
}

// ============================================================================
// COMPLETE THEME INTERFACE
// ============================================================================

interface Theme {
  id: ThemeMode;
  name: string;
  tagline: string;
  unlockXP: number;
  colors: ThemeColors;
  effects: ThemeEffects;
}

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  setThemeMode: (mode: ThemeMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
  // Convenience accessors
  colors: ThemeColors;
  effects: ThemeEffects;
  // Platform detection for progressive enhancement
  isWeb: boolean;
  // Check if theme is unlocked
  isThemeUnlocked: (mode: ThemeMode, currentXP: number) => boolean;
  
  // LEGACY: Backward compatibility
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

// ============================================================================
// HELPER: Create shadow config
// ============================================================================

const createShadow = (
  color: string,
  opacity: number,
  radius: number,
  elevation: number,
  offsetY: number = 2
): ShadowConfig => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: elevation,
});

// ============================================================================
// CYBER THEME (Default)
// "System initialised. Welcome to the grid."
// ============================================================================

const createCyberTheme = (isDark: boolean): Theme => {
  const darkColors = {
    primary: '#00F5FF',
    primaryMuted: '#00C4CC',
    secondary: '#FF006E',
    secondaryMuted: '#CC0058',
    tertiary: '#7C4DFF',
    
    background: '#0A0F1E',
    backgroundAlt: '#0D1425',
    surface: '#141E37',
    surfaceElevated: '#1A2744',
    
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textOnPrimary: '#0A0F1E',
    
    border: '#1E3A5F',
    borderSubtle: '#152238',
    divider: '#1E293B',
    
    success: '#00FF88',
    warning: '#FFB800',
    error: '#FF3366',
    info: '#00F5FF',
    
    glowPrimary: '#00F5FF',
    glowSecondary: '#FF006E',
  };
  
  const lightColors = {
    primary: '#00B4D8',
    primaryMuted: '#0096B4',
    secondary: '#E5006A',
    secondaryMuted: '#B80055',
    tertiary: '#6C3FD1',
    
    background: '#F0F4F8',
    backgroundAlt: '#E2E8F0',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    
    border: '#CBD5E1',
    borderSubtle: '#E2E8F0',
    divider: '#E2E8F0',
    
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0891B2',
    
    glowPrimary: '#00B4D8',
    glowSecondary: '#E5006A',
  };
  
  const colors = isDark ? darkColors : lightColors;
  
  return {
    id: 'cyber',
    name: 'Cyber',
    tagline: 'System initialised. Welcome to the grid.',
    unlockXP: 0,
    colors: {
      ...colors,
      accent: colors.secondary,
      gradient: [colors.background, colors.backgroundAlt, colors.surface] as const,
      cardGradient: [colors.surface, colors.surfaceElevated] as const,
      buttonGradient: [colors.primary, colors.primaryMuted] as const,
    },
    effects: {
      radiusSmall: 4,
      radiusMedium: 8,
      radiusLarge: 12,
      radiusXLarge: 16,
      radiusFull: 9999,
      
      shadow: {
        small: createShadow(isDark ? '#00F5FF' : '#000000', isDark ? 0.15 : 0.05, 4, 2),
        medium: createShadow(isDark ? '#00F5FF' : '#000000', isDark ? 0.2 : 0.08, 8, 4),
        large: createShadow(isDark ? '#00F5FF' : '#000000', isDark ? 0.25 : 0.1, 16, 8),
        glow: createShadow(isDark ? '#00F5FF' : '#00B4D8', isDark ? 0.4 : 0.2, 20, 10, 0),
      },
      
      timing: {
        fast: 150,
        medium: 250,
        slow: 400,
        dramatic: 600,
      },
      
      animations: {
        pulseEnabled: true,
        pulseScale: 1.02,
        pulseDuration: 2000,
        glowEnabled: true,
        glowIntensity: 0.6,
        floatEnabled: false,
        floatDistance: 0,
      },
    },
  };
};

// ============================================================================
// PULSE THEME (1,000 XP)
// "First heartbeat detected. System alive."
// ============================================================================

const createPulseTheme = (isDark: boolean): Theme => {
  const darkColors = {
    primary: '#FF6B35',
    primaryMuted: '#E55A2B',
    secondary: '#FF006E',
    secondaryMuted: '#CC0058',
    tertiary: '#FBBF24',
    
    background: '#120A08',
    backgroundAlt: '#1A0F0C',
    surface: '#281612',
    surfaceElevated: '#321C16',
    
    text: '#FFF7ED',
    textSecondary: '#D6BCAB',
    textMuted: '#A8968A',
    textOnPrimary: '#120A08',
    
    border: '#4A2E24',
    borderSubtle: '#3A2218',
    divider: '#3A2218',
    
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#FF4444',
    info: '#FF6B35',
    
    glowPrimary: '#FF6B35',
    glowSecondary: '#FF006E',
  };
  
  const lightColors = {
    primary: '#E55A2B',
    primaryMuted: '#D14E22',
    secondary: '#D10058',
    secondaryMuted: '#A80047',
    tertiary: '#D97706',
    
    background: '#FFF8F5',
    backgroundAlt: '#FFF0EB',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    text: '#2D1810',
    textSecondary: '#6B4B3E',
    textMuted: '#9C8479',
    textOnPrimary: '#FFFFFF',
    
    border: '#E8D5CC',
    borderSubtle: '#F5EBE6',
    divider: '#F5EBE6',
    
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#E55A2B',
    
    glowPrimary: '#E55A2B',
    glowSecondary: '#D10058',
  };
  
  const colors = isDark ? darkColors : lightColors;
  
  return {
    id: 'pulse',
    name: 'Pulse',
    tagline: 'First heartbeat detected. System alive.',
    unlockXP: 1000,
    colors: {
      ...colors,
      accent: colors.secondary,
      gradient: [colors.background, colors.backgroundAlt, colors.surface] as const,
      cardGradient: [colors.surface, colors.surfaceElevated] as const,
      buttonGradient: [colors.primary, colors.primaryMuted] as const,
    },
    effects: {
      radiusSmall: 8,
      radiusMedium: 14,
      radiusLarge: 20,
      radiusXLarge: 28,
      radiusFull: 9999,
      
      shadow: {
        small: createShadow(isDark ? '#FF6B35' : '#000000', isDark ? 0.15 : 0.05, 6, 3),
        medium: createShadow(isDark ? '#FF6B35' : '#000000', isDark ? 0.2 : 0.08, 12, 6),
        large: createShadow(isDark ? '#FF6B35' : '#000000', isDark ? 0.25 : 0.1, 20, 10),
        glow: createShadow(isDark ? '#FF6B35' : '#E55A2B', isDark ? 0.4 : 0.15, 25, 12, 0),
      },
      
      timing: {
        fast: 200,
        medium: 350,
        slow: 500,
        dramatic: 800,
      },
      
      animations: {
        pulseEnabled: true,
        pulseScale: 1.03,
        pulseDuration: 3000,
        glowEnabled: true,
        glowIntensity: 0.7,
        floatEnabled: true,
        floatDistance: 4,
      },
    },
  };
};

// ============================================================================
// AURORA THEME (20,000 XP)
// "You've transcended the grid. Welcome to the sky."
// ============================================================================

const createAuroraTheme = (isDark: boolean): Theme => {
  const darkColors = {
    primary: '#22D3EE',
    primaryMuted: '#0EA5C4',
    secondary: '#A855F7',
    secondaryMuted: '#8B3DD4',
    tertiary: '#34D399',
    
    background: '#050A14',
    backgroundAlt: '#0A1020',
    surface: '#0F1932',
    surfaceElevated: '#152242',
    
    text: '#F0FDFA',
    textSecondary: '#A5B4C6',
    textMuted: '#6B7A8E',
    textOnPrimary: '#050A14',
    
    border: '#1E3A5F',
    borderSubtle: '#152238',
    divider: '#1A2744',
    
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#22D3EE',
    
    glowPrimary: '#22D3EE',
    glowSecondary: '#A855F7',
  };
  
  const lightColors = {
    primary: '#0891B2',
    primaryMuted: '#0E7490',
    secondary: '#9333EA',
    secondaryMuted: '#7C3AED',
    tertiary: '#059669',
    
    background: '#F0FDFA',
    backgroundAlt: '#E0F7F5',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    
    border: '#A7F3D0',
    borderSubtle: '#D1FAE5',
    divider: '#D1FAE5',
    
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0891B2',
    
    glowPrimary: '#0891B2',
    glowSecondary: '#9333EA',
  };
  
  const colors = isDark ? darkColors : lightColors;
  
  return {
    id: 'aurora',
    name: 'Aurora',
    tagline: "You've transcended the grid. Welcome to the sky.",
    unlockXP: 20000,
    colors: {
      ...colors,
      accent: colors.tertiary,
      gradient: [colors.background, colors.backgroundAlt, colors.surface] as const,
      cardGradient: [colors.surface, colors.surfaceElevated] as const,
      buttonGradient: [colors.primary, colors.secondary] as const,
    },
    effects: {
      radiusSmall: 10,
      radiusMedium: 18,
      radiusLarge: 26,
      radiusXLarge: 36,
      radiusFull: 9999,
      
      shadow: {
        small: createShadow(isDark ? '#22D3EE' : '#000000', isDark ? 0.12 : 0.05, 8, 4),
        medium: createShadow(isDark ? '#22D3EE' : '#000000', isDark ? 0.18 : 0.08, 16, 8),
        large: createShadow(isDark ? '#22D3EE' : '#000000', isDark ? 0.22 : 0.1, 24, 12),
        glow: createShadow(isDark ? '#22D3EE' : '#0891B2', isDark ? 0.35 : 0.12, 30, 15, 0),
      },
      
      timing: {
        fast: 250,
        medium: 450,
        slow: 700,
        dramatic: 1200,
      },
      
      animations: {
        pulseEnabled: true,
        pulseScale: 1.02,
        pulseDuration: 4000,
        glowEnabled: true,
        glowIntensity: 0.8,
        floatEnabled: true,
        floatDistance: 6,
      },
    },
  };
};

// ============================================================================
// SINGULARITY THEME (200,000 XP)
// "You ARE the revision. Reality bends to your will."
// ============================================================================

const createSingularityTheme = (isDark: boolean): Theme => {
  const darkColors = {
    primary: '#FBBF24',
    primaryMuted: '#D99F1C',
    secondary: '#F472B6',
    secondaryMuted: '#E04D9A',
    tertiary: '#FFFFFF',
    
    background: '#000000',
    backgroundAlt: '#030206',
    surface: '#0A0612',
    surfaceElevated: '#120B1A',
    
    text: '#FFFBEB',
    textSecondary: '#D4AF37',
    textMuted: '#A08630',
    textOnPrimary: '#000000',
    
    border: '#3D2F14',
    borderSubtle: '#2A200D',
    divider: '#2A200D',
    
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#FF4444',
    info: '#FBBF24',
    
    glowPrimary: '#FBBF24',
    glowSecondary: '#F472B6',
  };
  
  const lightColors = {
    primary: '#D97706',
    primaryMuted: '#B45309',
    secondary: '#DB2777',
    secondaryMuted: '#BE185D',
    tertiary: '#000000',
    
    background: '#FFFBEB',
    backgroundAlt: '#FEF3C7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    text: '#1C1917',
    textSecondary: '#78716C',
    textMuted: '#A8A29E',
    textOnPrimary: '#FFFFFF',
    
    border: '#FDE68A',
    borderSubtle: '#FEF3C7',
    divider: '#FEF3C7',
    
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#D97706',
    
    glowPrimary: '#D97706',
    glowSecondary: '#DB2777',
  };
  
  const colors = isDark ? darkColors : lightColors;
  
  return {
    id: 'singularity',
    name: 'Singularity',
    tagline: 'You ARE the revision. Reality bends to your will.',
    unlockXP: 200000,
    colors: {
      ...colors,
      accent: colors.secondary,
      gradient: [colors.background, colors.backgroundAlt, colors.surface] as const,
      cardGradient: [colors.surface, colors.surfaceElevated] as const,
      buttonGradient: [colors.primary, colors.tertiary] as const,
    },
    effects: {
      radiusSmall: 6,
      radiusMedium: 14,
      radiusLarge: 22,
      radiusXLarge: 32,
      radiusFull: 9999,
      
      shadow: {
        small: createShadow(isDark ? '#FBBF24' : '#000000', isDark ? 0.2 : 0.08, 8, 4),
        medium: createShadow(isDark ? '#FBBF24' : '#000000', isDark ? 0.28 : 0.1, 16, 8),
        large: createShadow(isDark ? '#FBBF24' : '#000000', isDark ? 0.35 : 0.12, 28, 14),
        glow: createShadow(isDark ? '#FBBF24' : '#D97706', isDark ? 0.5 : 0.2, 40, 20, 0),
      },
      
      timing: {
        fast: 200,
        medium: 400,
        slow: 700,
        dramatic: 1500,
      },
      
      animations: {
        pulseEnabled: true,
        pulseScale: 1.025,
        pulseDuration: 3000,
        glowEnabled: true,
        glowIntensity: 1.0,
        floatEnabled: true,
        floatDistance: 8,
      },
    },
  };
};

// ============================================================================
// THEME REGISTRY
// ============================================================================

const themeUnlockXP: Record<ThemeMode, number> = {
  cyber: 0,
  pulse: 1000,
  aurora: 20000,
  singularity: 200000,
};

// ============================================================================
// CONTEXT PROVIDER
// ============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('cyber');
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('dark');

  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [savedTheme, savedScheme, legacyTheme] = await Promise.all([
        AsyncStorage.getItem('fl4sh_theme_mode'),
        AsyncStorage.getItem('fl4sh_color_scheme'),
        AsyncStorage.getItem('appTheme'), // Old key
      ]);
      
      // Migrate old theme preferences
      let themeToUse = savedTheme;
      if (!themeToUse && legacyTheme) {
        // Map legacy themes
        const migrationMap: Record<string, ThemeMode> = {
          'default': 'cyber',
          'cyber': 'cyber',
          'pulse': 'pulse',
          'aurora': 'aurora',
          'singularity': 'singularity',
        };
        themeToUse = migrationMap[legacyTheme] || 'cyber';
        
        // Save migrated value
        await AsyncStorage.setItem('fl4sh_theme_mode', themeToUse);
        // Clean up old key
        await AsyncStorage.removeItem('appTheme');
        
        console.log(`[Theme] Migrated legacy theme: ${legacyTheme} → ${themeToUse}`);
      }
      
      if (themeToUse && ['cyber', 'pulse', 'aurora', 'singularity'].includes(themeToUse)) {
        setThemeModeState(themeToUse as ThemeMode);
      }
      
      if (savedScheme && (savedScheme === 'dark' || savedScheme === 'light')) {
        setColorSchemeState(savedScheme as ColorScheme);
      }
    } catch (error) {
      console.error('Error loading theme preferences:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('fl4sh_theme_mode', mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    try {
      await AsyncStorage.setItem('fl4sh_color_scheme', scheme);
    } catch (error) {
      console.error('Error saving color scheme:', error);
    }
  };

  const toggleColorScheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  const isThemeUnlocked = (mode: ThemeMode, currentXP: number): boolean => {
    return currentXP >= themeUnlockXP[mode];
  };

  // Generate theme based on current mode and scheme
  const generateTheme = (mode: ThemeMode, scheme: ColorScheme): Theme => {
    const isDark = scheme === 'dark';
    switch (mode) {
      case 'cyber': return createCyberTheme(isDark);
      case 'pulse': return createPulseTheme(isDark);
      case 'aurora': return createAuroraTheme(isDark);
      case 'singularity': return createSingularityTheme(isDark);
      default: return createCyberTheme(isDark);
    }
  };

  const theme = generateTheme(themeMode, colorScheme);

  // LEGACY: Backward compatibility methods
  const toggleTheme = () => {
    // Old behavior: toggle between cyber and the next unlocked theme
    const currentIndex = ['cyber', 'pulse', 'aurora', 'singularity'].indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % 4;
    const nextTheme = ['cyber', 'pulse', 'aurora', 'singularity'][nextIndex] as ThemeMode;
    setThemeMode(nextTheme);
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        colorScheme,
        setThemeMode,
        setColorScheme,
        toggleColorScheme,
        colors: theme.colors,
        effects: theme.effects,
        isWeb,
        isThemeUnlocked,
        // Legacy methods
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { themeUnlockXP };
export type { Theme, ThemeColors, ThemeEffects, ShadowConfig };
