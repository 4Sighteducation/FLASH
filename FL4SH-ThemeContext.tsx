import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// FL4SH THEME SYSTEM v2.0
// ============================================================================
// Theme Progression: Cyber (Default) → Pulse (1,000 XP) → Aurora (20,000 XP) → Singularity (200,000 XP)
// Each theme supports both DARK and LIGHT modes
// Progressive "wow factor" - each unlock feels more premium than the last
// ============================================================================

export type ThemeMode = 'cyber' | 'pulse' | 'aurora' | 'singularity';
export type ColorScheme = 'dark' | 'light';

// ============================================================================
// COLOR DEFINITIONS
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
  
  // Glows & Effects
  glowPrimary: string;
  glowSecondary: string;
  glowTertiary: string;
  
  // Gradients (CSS strings)
  gradientPrimary: string;
  gradientSecondary: string;
  gradientBackground: string;
  gradientCard: string;
  gradientButton: string;
  gradientGlow: string;
  
  // Special effects
  shimmer: string;
  overlay: string;
  backdrop: string;
}

// ============================================================================
// EFFECT DEFINITIONS
// ============================================================================

interface ThemeEffects {
  // Border radius scale
  radiusSmall: number;
  radiusMedium: number;
  radiusLarge: number;
  radiusXLarge: number;
  radiusFull: number;
  
  // Shadows (box-shadow strings)
  shadowSmall: string;
  shadowMedium: string;
  shadowLarge: string;
  shadowGlow: string;
  shadowInset: string;
  
  // Animation timing
  durationFast: number;
  durationMedium: number;
  durationSlow: number;
  durationDramatic: number;
  
  // Easing curves
  easeDefault: string;
  easeSnappy: string;
  easeElastic: string;
  easeBounce: string;
  
  // Blur values
  blurSmall: number;
  blurMedium: number;
  blurLarge: number;
  
  // Special CSS effects (for Aurora & Singularity)
  backdropFilter: string;
  mixBlendMode: string;
  
  // Animation presets (keyframe names or inline definitions)
  pulseAnimation: string;
  glowAnimation: string;
  shimmerAnimation: string;
  floatAnimation: string;
  specialAnimation: string;
}

// ============================================================================
// TYPOGRAPHY DEFINITIONS
// ============================================================================

interface ThemeTypography {
  fontPrimary: string;
  fontSecondary: string;
  fontMono: string;
  
  // Font weights
  weightLight: number;
  weightRegular: number;
  weightMedium: number;
  weightSemibold: number;
  weightBold: number;
  weightBlack: number;
  
  // Letter spacing
  trackingTight: number;
  trackingNormal: number;
  trackingWide: number;
  trackingUltraWide: number;
}

// ============================================================================
// COMPLETE THEME INTERFACE
// ============================================================================

interface Theme {
  id: ThemeMode;
  name: string;
  tagline: string;
  description: string;
  unlockXP: number;
  colorScheme: ColorScheme;
  colors: ThemeColors;
  effects: ThemeEffects;
  typography: ThemeTypography;
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
  typography: ThemeTypography;
  // Check if theme is unlocked (pass current XP)
  isThemeUnlocked: (mode: ThemeMode, currentXP: number) => boolean;
}

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

// Shared typography (consistent across themes)
const baseTypography: ThemeTypography = {
  fontPrimary: '"Exo 2", "SF Pro Display", system-ui, sans-serif',
  fontSecondary: '"Rajdhani", "SF Pro Text", system-ui, sans-serif',
  fontMono: '"JetBrains Mono", "SF Mono", monospace',
  weightLight: 300,
  weightRegular: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
  weightBlack: 900,
  trackingTight: -0.02,
  trackingNormal: 0,
  trackingWide: 0.05,
  trackingUltraWide: 0.15,
};

// ============================================================================
// CYBER THEME (Default)
// "System initialised. Welcome to the grid."
// Sharp, digital, precise. Neon cyan and pink on deep blue-black.
// ============================================================================

const cyberDark: Theme = {
  id: 'cyber',
  name: 'Cyber',
  tagline: 'System initialised. Welcome to the grid.',
  description: 'The original neon-tech aesthetic. Hard edges, digital precision, pure cyber energy.',
  unlockXP: 0,
  colorScheme: 'dark',
  colors: {
    // Core - Cyan primary, Pink secondary
    primary: '#00F5FF',
    primaryMuted: 'rgba(0, 245, 255, 0.7)',
    secondary: '#FF006E',
    secondaryMuted: 'rgba(255, 0, 110, 0.7)',
    tertiary: '#7C4DFF',
    
    // Backgrounds - Deep blue-black
    background: '#0A0F1E',
    backgroundAlt: '#0D1425',
    surface: 'rgba(13, 20, 37, 0.8)',
    surfaceElevated: 'rgba(20, 30, 55, 0.9)',
    
    // Text
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textOnPrimary: '#0A0F1E',
    
    // Borders
    border: 'rgba(0, 245, 255, 0.3)',
    borderSubtle: 'rgba(0, 245, 255, 0.15)',
    divider: 'rgba(148, 163, 184, 0.2)',
    
    // Semantic
    success: '#00FF88',
    warning: '#FFB800',
    error: '#FF3366',
    info: '#00F5FF',
    
    // Glows
    glowPrimary: 'rgba(0, 245, 255, 0.5)',
    glowSecondary: 'rgba(255, 0, 110, 0.5)',
    glowTertiary: 'rgba(124, 77, 255, 0.5)',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #00F5FF 0%, #00D4FF 100%)',
    gradientSecondary: 'linear-gradient(135deg, #FF006E 0%, #FF4081 100%)',
    gradientBackground: 'linear-gradient(180deg, #0A0F1E 0%, #0F172A 50%, #1E293B 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(20, 30, 55, 0.9) 0%, rgba(13, 20, 37, 0.95) 100%)',
    gradientButton: 'linear-gradient(135deg, #00F5FF 0%, #00D4FF 50%, #00F5FF 100%)',
    gradientGlow: 'radial-gradient(ellipse at center, rgba(0, 245, 255, 0.3) 0%, transparent 70%)',
    
    // Special
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(0, 245, 255, 0.4) 50%, transparent 100%)',
    overlay: 'rgba(10, 15, 30, 0.85)',
    backdrop: 'rgba(10, 15, 30, 0.7)',
  },
  effects: {
    // Radius - Sharp, technical
    radiusSmall: 4,
    radiusMedium: 8,
    radiusLarge: 12,
    radiusXLarge: 16,
    radiusFull: 9999,
    
    // Shadows - Hard neon glows
    shadowSmall: '0 2px 8px rgba(0, 0, 0, 0.4)',
    shadowMedium: '0 4px 16px rgba(0, 0, 0, 0.5)',
    shadowLarge: '0 8px 32px rgba(0, 0, 0, 0.6)',
    shadowGlow: '0 0 20px rgba(0, 245, 255, 0.4), 0 0 40px rgba(0, 245, 255, 0.2)',
    shadowInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    
    // Timing - Fast, snappy
    durationFast: 150,
    durationMedium: 250,
    durationSlow: 400,
    durationDramatic: 600,
    
    // Easing
    easeDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeSnappy: 'cubic-bezier(0.2, 0, 0, 1)',
    easeElastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    easeBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    
    // Blur
    blurSmall: 4,
    blurMedium: 8,
    blurLarge: 16,
    
    // Effects
    backdropFilter: 'blur(8px) saturate(180%)',
    mixBlendMode: 'screen',
    
    // Animations
    pulseAnimation: 'cyber-pulse 2s ease-in-out infinite',
    glowAnimation: 'cyber-glow 1.5s ease-in-out infinite alternate',
    shimmerAnimation: 'cyber-shimmer 2s linear infinite',
    floatAnimation: 'none',
    specialAnimation: 'cyber-scanline 3s linear infinite',
  },
  typography: {
    ...baseTypography,
    fontPrimary: '"Orbitron", "Exo 2", system-ui, sans-serif',
  },
};

const cyberLight: Theme = {
  ...cyberDark,
  colorScheme: 'light',
  colors: {
    ...cyberDark.colors,
    // Invert for light mode - maintain neon feel
    primary: '#00B4D8',
    primaryMuted: 'rgba(0, 180, 216, 0.7)',
    secondary: '#E5006A',
    secondaryMuted: 'rgba(229, 0, 106, 0.7)',
    
    background: '#F0F4F8',
    backgroundAlt: '#E2E8F0',
    surface: 'rgba(255, 255, 255, 0.9)',
    surfaceElevated: 'rgba(255, 255, 255, 0.95)',
    
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    
    border: 'rgba(0, 180, 216, 0.4)',
    borderSubtle: 'rgba(0, 180, 216, 0.2)',
    divider: 'rgba(71, 85, 105, 0.15)',
    
    glowPrimary: 'rgba(0, 180, 216, 0.3)',
    glowSecondary: 'rgba(229, 0, 106, 0.3)',
    glowTertiary: 'rgba(124, 77, 255, 0.3)',
    
    gradientBackground: 'linear-gradient(180deg, #F0F4F8 0%, #E2E8F0 50%, #CBD5E1 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.9) 100%)',
    gradientGlow: 'radial-gradient(ellipse at center, rgba(0, 180, 216, 0.15) 0%, transparent 70%)',
    
    overlay: 'rgba(240, 244, 248, 0.9)',
    backdrop: 'rgba(240, 244, 248, 0.8)',
  },
  effects: {
    ...cyberDark.effects,
    shadowSmall: '0 2px 8px rgba(0, 0, 0, 0.08)',
    shadowMedium: '0 4px 16px rgba(0, 0, 0, 0.1)',
    shadowLarge: '0 8px 32px rgba(0, 0, 0, 0.12)',
    shadowGlow: '0 0 20px rgba(0, 180, 216, 0.25), 0 0 40px rgba(0, 180, 216, 0.15)',
  },
};

// ============================================================================
// PULSE THEME (1,000 XP)
// "First heartbeat detected. System alive."
// Organic, warm, breathing. Orange and ember tones.
// ============================================================================

const pulseDark: Theme = {
  id: 'pulse',
  name: 'Pulse',
  tagline: 'First heartbeat detected. System alive.',
  description: 'Organic tech fusion. Your progress has a pulse now — warm, alive, breathing.',
  unlockXP: 1000,
  colorScheme: 'dark',
  colors: {
    // Core - Warm orange/red palette
    primary: '#FF6B35',
    primaryMuted: 'rgba(255, 107, 53, 0.7)',
    secondary: '#FF006E',
    secondaryMuted: 'rgba(255, 0, 110, 0.7)',
    tertiary: '#FBBF24',
    
    // Backgrounds - Warm dark
    background: '#120A08',
    backgroundAlt: '#1A0F0C',
    surface: 'rgba(26, 15, 12, 0.85)',
    surfaceElevated: 'rgba(40, 22, 18, 0.9)',
    
    // Text
    text: '#FFF7ED',
    textSecondary: '#D6BCAB',
    textMuted: '#A8968A',
    textOnPrimary: '#120A08',
    
    // Borders
    border: 'rgba(255, 107, 53, 0.35)',
    borderSubtle: 'rgba(255, 107, 53, 0.15)',
    divider: 'rgba(214, 188, 171, 0.2)',
    
    // Semantic
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#FF4444',
    info: '#FF6B35',
    
    // Glows - Warm ember glows
    glowPrimary: 'rgba(255, 107, 53, 0.5)',
    glowSecondary: 'rgba(255, 0, 110, 0.4)',
    glowTertiary: 'rgba(251, 191, 36, 0.4)',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #FF6B35 0%, #FF8F5C 100%)',
    gradientSecondary: 'linear-gradient(135deg, #FF006E 0%, #FF4081 100%)',
    gradientBackground: 'linear-gradient(180deg, #120A08 0%, #1A0F0C 50%, #251612 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(40, 22, 18, 0.9) 0%, rgba(26, 15, 12, 0.95) 100%)',
    gradientButton: 'linear-gradient(135deg, #FF6B35 0%, #FF4444 50%, #FF6B35 100%)',
    gradientGlow: 'radial-gradient(ellipse at center, rgba(255, 107, 53, 0.35) 0%, transparent 70%)',
    
    // Special
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(255, 107, 53, 0.5) 50%, transparent 100%)',
    overlay: 'rgba(18, 10, 8, 0.9)',
    backdrop: 'rgba(18, 10, 8, 0.75)',
  },
  effects: {
    // Radius - Softer, more organic
    radiusSmall: 8,
    radiusMedium: 14,
    radiusLarge: 20,
    radiusXLarge: 28,
    radiusFull: 9999,
    
    // Shadows - Warm ember glows
    shadowSmall: '0 2px 10px rgba(255, 107, 53, 0.15)',
    shadowMedium: '0 4px 20px rgba(255, 107, 53, 0.2)',
    shadowLarge: '0 8px 40px rgba(255, 107, 53, 0.25)',
    shadowGlow: '0 0 25px rgba(255, 107, 53, 0.4), 0 0 50px rgba(255, 107, 53, 0.2)',
    shadowInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    
    // Timing - Medium, organic breathing
    durationFast: 200,
    durationMedium: 350,
    durationSlow: 500,
    durationDramatic: 800,
    
    // Easing - Organic, bouncy
    easeDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeSnappy: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    easeElastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    easeBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    
    // Blur
    blurSmall: 6,
    blurMedium: 12,
    blurLarge: 20,
    
    // Effects
    backdropFilter: 'blur(12px) saturate(150%)',
    mixBlendMode: 'screen',
    
    // Animations - Breathing, pulsing
    pulseAnimation: 'pulse-breathe 3s ease-in-out infinite',
    glowAnimation: 'pulse-ember 2s ease-in-out infinite',
    shimmerAnimation: 'pulse-shimmer 2.5s ease-in-out infinite',
    floatAnimation: 'pulse-float 4s ease-in-out infinite',
    specialAnimation: 'pulse-heartbeat 1.5s ease-in-out infinite',
  },
  typography: {
    ...baseTypography,
    fontPrimary: '"Quicksand", "Nunito", system-ui, sans-serif',
  },
};

const pulseLight: Theme = {
  ...pulseDark,
  colorScheme: 'light',
  colors: {
    ...pulseDark.colors,
    primary: '#E55A2B',
    primaryMuted: 'rgba(229, 90, 43, 0.7)',
    secondary: '#D10058',
    
    background: '#FFF8F5',
    backgroundAlt: '#FFF0EB',
    surface: 'rgba(255, 255, 255, 0.9)',
    surfaceElevated: 'rgba(255, 255, 255, 0.95)',
    
    text: '#2D1810',
    textSecondary: '#6B4B3E',
    textMuted: '#9C8479',
    textOnPrimary: '#FFFFFF',
    
    border: 'rgba(229, 90, 43, 0.35)',
    borderSubtle: 'rgba(229, 90, 43, 0.15)',
    divider: 'rgba(107, 75, 62, 0.15)',
    
    gradientBackground: 'linear-gradient(180deg, #FFF8F5 0%, #FFF0EB 50%, #FFE4DB 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 245, 0.9) 100%)',
    
    overlay: 'rgba(255, 248, 245, 0.92)',
    backdrop: 'rgba(255, 248, 245, 0.8)',
  },
  effects: {
    ...pulseDark.effects,
    shadowSmall: '0 2px 10px rgba(229, 90, 43, 0.1)',
    shadowMedium: '0 4px 20px rgba(229, 90, 43, 0.12)',
    shadowLarge: '0 8px 40px rgba(229, 90, 43, 0.15)',
    shadowGlow: '0 0 25px rgba(229, 90, 43, 0.2), 0 0 50px rgba(229, 90, 43, 0.1)',
  },
};

// ============================================================================
// AURORA THEME (20,000 XP)
// "You've transcended the grid. Welcome to the sky."
// Ethereal, flowing, dreamy. Multi-color gradients like northern lights.
// ============================================================================

const auroraDark: Theme = {
  id: 'aurora',
  name: 'Aurora',
  tagline: "You've transcended the grid. Welcome to the sky.",
  description: 'Ethereal and flowing. Soft gradients dance like northern lights across your interface.',
  unlockXP: 20000,
  colorScheme: 'dark',
  colors: {
    // Core - Ethereal cyan, purple, green
    primary: '#22D3EE',
    primaryMuted: 'rgba(34, 211, 238, 0.7)',
    secondary: '#A855F7',
    secondaryMuted: 'rgba(168, 85, 247, 0.7)',
    tertiary: '#34D399',
    
    // Backgrounds - Deep cosmic blue
    background: '#050A14',
    backgroundAlt: '#0A1020',
    surface: 'rgba(10, 16, 32, 0.75)',
    surfaceElevated: 'rgba(15, 25, 50, 0.85)',
    
    // Text
    text: '#F0FDFA',
    textSecondary: '#A5B4C6',
    textMuted: '#6B7A8E',
    textOnPrimary: '#050A14',
    
    // Borders - Iridescent
    border: 'rgba(34, 211, 238, 0.3)',
    borderSubtle: 'rgba(168, 85, 247, 0.2)',
    divider: 'rgba(165, 180, 198, 0.15)',
    
    // Semantic
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#22D3EE',
    
    // Glows - Multi-color, ethereal
    glowPrimary: 'rgba(34, 211, 238, 0.4)',
    glowSecondary: 'rgba(168, 85, 247, 0.4)',
    glowTertiary: 'rgba(52, 211, 153, 0.4)',
    
    // Gradients - THE STAR: Multi-stop aurora gradients
    gradientPrimary: 'linear-gradient(135deg, #22D3EE 0%, #A855F7 50%, #34D399 100%)',
    gradientSecondary: 'linear-gradient(135deg, #A855F7 0%, #EC4899 50%, #F97316 100%)',
    gradientBackground: 'linear-gradient(180deg, #050A14 0%, #0A1525 30%, #101835 60%, #0A1020 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(15, 25, 50, 0.85) 0%, rgba(10, 16, 32, 0.9) 100%)',
    gradientButton: 'linear-gradient(135deg, #22D3EE 0%, #A855F7 50%, #34D399 100%)',
    gradientGlow: 'radial-gradient(ellipse at 30% 20%, rgba(34, 211, 238, 0.25) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)',
    
    // Special - Aurora-specific
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(34, 211, 238, 0.3) 25%, rgba(168, 85, 247, 0.3) 50%, rgba(52, 211, 153, 0.3) 75%, transparent 100%)',
    overlay: 'rgba(5, 10, 20, 0.88)',
    backdrop: 'rgba(5, 10, 20, 0.7)',
  },
  effects: {
    // Radius - Soft, flowing
    radiusSmall: 10,
    radiusMedium: 18,
    radiusLarge: 26,
    radiusXLarge: 36,
    radiusFull: 9999,
    
    // Shadows - Soft, multi-colored glows
    shadowSmall: '0 2px 12px rgba(34, 211, 238, 0.1), 0 2px 8px rgba(168, 85, 247, 0.1)',
    shadowMedium: '0 4px 24px rgba(34, 211, 238, 0.15), 0 4px 16px rgba(168, 85, 247, 0.12)',
    shadowLarge: '0 8px 48px rgba(34, 211, 238, 0.2), 0 8px 32px rgba(168, 85, 247, 0.15)',
    shadowGlow: '0 0 30px rgba(34, 211, 238, 0.35), 0 0 60px rgba(168, 85, 247, 0.25), 0 0 90px rgba(52, 211, 153, 0.15)',
    shadowInset: 'inset 0 1px 1px rgba(255, 255, 255, 0.06)',
    
    // Timing - Slow, dreamy
    durationFast: 250,
    durationMedium: 450,
    durationSlow: 700,
    durationDramatic: 1200,
    
    // Easing - Smooth, flowing
    easeDefault: 'cubic-bezier(0.4, 0, 0.1, 1)',
    easeSnappy: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    easeElastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    easeBounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    
    // Blur - Heavy for ethereal effect
    blurSmall: 8,
    blurMedium: 16,
    blurLarge: 32,
    
    // Effects - Enhanced
    backdropFilter: 'blur(20px) saturate(180%) brightness(1.1)',
    mixBlendMode: 'soft-light',
    
    // Animations - Flowing, ethereal
    pulseAnimation: 'aurora-wave 8s ease-in-out infinite',
    glowAnimation: 'aurora-shimmer 4s ease-in-out infinite',
    shimmerAnimation: 'aurora-flow 6s linear infinite',
    floatAnimation: 'aurora-drift 10s ease-in-out infinite',
    specialAnimation: 'aurora-lights 15s ease-in-out infinite',
  },
  typography: {
    ...baseTypography,
    fontPrimary: '"Outfit", "Poppins", system-ui, sans-serif',
  },
};

const auroraLight: Theme = {
  ...auroraDark,
  colorScheme: 'light',
  colors: {
    ...auroraDark.colors,
    primary: '#0891B2',
    primaryMuted: 'rgba(8, 145, 178, 0.7)',
    secondary: '#9333EA',
    secondaryMuted: 'rgba(147, 51, 234, 0.7)',
    tertiary: '#059669',
    
    background: '#F0FDFA',
    backgroundAlt: '#E0F7F5',
    surface: 'rgba(255, 255, 255, 0.85)',
    surfaceElevated: 'rgba(255, 255, 255, 0.92)',
    
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textOnPrimary: '#FFFFFF',
    
    border: 'rgba(8, 145, 178, 0.3)',
    borderSubtle: 'rgba(147, 51, 234, 0.2)',
    divider: 'rgba(71, 85, 105, 0.12)',
    
    gradientBackground: 'linear-gradient(180deg, #F0FDFA 0%, #E0F7F5 30%, #ECFDF5 60%, #FDF4FF 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 253, 250, 0.88) 100%)',
    gradientGlow: 'radial-gradient(ellipse at 30% 20%, rgba(8, 145, 178, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)',
    
    overlay: 'rgba(240, 253, 250, 0.92)',
    backdrop: 'rgba(240, 253, 250, 0.8)',
  },
  effects: {
    ...auroraDark.effects,
    shadowSmall: '0 2px 12px rgba(8, 145, 178, 0.08), 0 2px 8px rgba(147, 51, 234, 0.06)',
    shadowMedium: '0 4px 24px rgba(8, 145, 178, 0.1), 0 4px 16px rgba(147, 51, 234, 0.08)',
    shadowLarge: '0 8px 48px rgba(8, 145, 178, 0.12), 0 8px 32px rgba(147, 51, 234, 0.1)',
    shadowGlow: '0 0 30px rgba(8, 145, 178, 0.2), 0 0 60px rgba(147, 51, 234, 0.15), 0 0 90px rgba(5, 150, 105, 0.1)',
  },
};

// ============================================================================
// SINGULARITY THEME (200,000 XP)
// "You ARE the revision. Reality bends to your will."
// Cosmic, gold, void. The ultimate status symbol.
// ============================================================================

const singularityDark: Theme = {
  id: 'singularity',
  name: 'Singularity',
  tagline: 'You ARE the revision. Reality bends to your will.',
  description: 'Cosmic transcendence. Gold and void. The ultimate flex — you\'ve become the singularity.',
  unlockXP: 200000,
  colorScheme: 'dark',
  colors: {
    // Core - Gold, hot pink, pure white
    primary: '#FBBF24',
    primaryMuted: 'rgba(251, 191, 36, 0.7)',
    secondary: '#F472B6',
    secondaryMuted: 'rgba(244, 114, 182, 0.7)',
    tertiary: '#FFFFFF',
    
    // Backgrounds - Pure void black
    background: '#000000',
    backgroundAlt: '#030206',
    surface: 'rgba(5, 3, 10, 0.85)',
    surfaceElevated: 'rgba(10, 6, 18, 0.9)',
    
    // Text - Gold tinted
    text: '#FFFBEB',
    textSecondary: '#D4AF37',
    textMuted: '#A08630',
    textOnPrimary: '#000000',
    
    // Borders - Gold
    border: 'rgba(251, 191, 36, 0.4)',
    borderSubtle: 'rgba(251, 191, 36, 0.2)',
    divider: 'rgba(212, 175, 55, 0.2)',
    
    // Semantic
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#FF4444',
    info: '#FBBF24',
    
    // Glows - Intense, white-hot cores
    glowPrimary: 'rgba(251, 191, 36, 0.6)',
    glowSecondary: 'rgba(244, 114, 182, 0.5)',
    glowTertiary: 'rgba(255, 255, 255, 0.4)',
    
    // Gradients - Cosmic, gold-infused
    gradientPrimary: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 30%, #D97706 60%, #FBBF24 100%)',
    gradientSecondary: 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #DB2777 100%)',
    gradientBackground: 'radial-gradient(ellipse at 50% 50%, #0A0612 0%, #030206 40%, #000000 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(10, 6, 18, 0.9) 0%, rgba(5, 3, 10, 0.95) 100%)',
    gradientButton: 'linear-gradient(135deg, #FBBF24 0%, #FFFFFF 50%, #FBBF24 100%)',
    gradientGlow: 'radial-gradient(ellipse at 50% 50%, rgba(251, 191, 36, 0.3) 0%, rgba(244, 114, 182, 0.15) 30%, transparent 70%)',
    
    // Special - Event horizon
    shimmer: 'linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.6) 40%, rgba(255, 255, 255, 0.8) 50%, rgba(251, 191, 36, 0.6) 60%, transparent 100%)',
    overlay: 'rgba(0, 0, 0, 0.92)',
    backdrop: 'rgba(0, 0, 0, 0.8)',
  },
  effects: {
    // Radius - Mix of sharp and soft
    radiusSmall: 6,
    radiusMedium: 14,
    radiusLarge: 22,
    radiusXLarge: 32,
    radiusFull: 9999,
    
    // Shadows - Intense, gravitational
    shadowSmall: '0 2px 12px rgba(251, 191, 36, 0.2), 0 2px 6px rgba(0, 0, 0, 0.5)',
    shadowMedium: '0 4px 24px rgba(251, 191, 36, 0.25), 0 4px 12px rgba(0, 0, 0, 0.6)',
    shadowLarge: '0 8px 48px rgba(251, 191, 36, 0.3), 0 8px 24px rgba(0, 0, 0, 0.7)',
    shadowGlow: '0 0 40px rgba(251, 191, 36, 0.5), 0 0 80px rgba(251, 191, 36, 0.3), 0 0 120px rgba(244, 114, 182, 0.2)',
    shadowInset: 'inset 0 0 20px rgba(251, 191, 36, 0.1)',
    
    // Timing - Dramatic, powerful
    durationFast: 200,
    durationMedium: 400,
    durationSlow: 700,
    durationDramatic: 1500,
    
    // Easing - Gravitational pull
    easeDefault: 'cubic-bezier(0.4, 0, 0, 1)',
    easeSnappy: 'cubic-bezier(0.2, 0, 0, 1)',
    easeElastic: 'cubic-bezier(0.5, 1.5, 0.5, 1)',
    easeBounce: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
    
    // Blur - Heavy for cosmic effect
    blurSmall: 8,
    blurMedium: 20,
    blurLarge: 40,
    
    // Effects - Maximum
    backdropFilter: 'blur(24px) saturate(200%) brightness(0.9) contrast(1.1)',
    mixBlendMode: 'color-dodge',
    
    // Animations - Reality-bending
    pulseAnimation: 'singularity-pulse 3s cubic-bezier(0.4, 0, 0, 1) infinite',
    glowAnimation: 'singularity-glow 2s ease-in-out infinite alternate',
    shimmerAnimation: 'singularity-shimmer 4s linear infinite',
    floatAnimation: 'singularity-warp 8s ease-in-out infinite',
    specialAnimation: 'singularity-vortex 20s linear infinite',
  },
  typography: {
    ...baseTypography,
    fontPrimary: '"Syncopate", "Audiowide", system-ui, sans-serif',
    trackingWide: 0.08,
    trackingUltraWide: 0.2,
  },
};

const singularityLight: Theme = {
  ...singularityDark,
  colorScheme: 'light',
  colors: {
    ...singularityDark.colors,
    primary: '#D97706',
    primaryMuted: 'rgba(217, 119, 6, 0.7)',
    secondary: '#DB2777',
    secondaryMuted: 'rgba(219, 39, 119, 0.7)',
    tertiary: '#000000',
    
    // Light singularity is almost inverted - white void with gold accents
    background: '#FFFBEB',
    backgroundAlt: '#FEF3C7',
    surface: 'rgba(255, 255, 255, 0.9)',
    surfaceElevated: 'rgba(255, 255, 255, 0.95)',
    
    text: '#1C1917',
    textSecondary: '#78716C',
    textMuted: '#A8A29E',
    textOnPrimary: '#FFFFFF',
    
    border: 'rgba(217, 119, 6, 0.4)',
    borderSubtle: 'rgba(217, 119, 6, 0.2)',
    divider: 'rgba(120, 113, 108, 0.15)',
    
    glowPrimary: 'rgba(217, 119, 6, 0.3)',
    glowSecondary: 'rgba(219, 39, 119, 0.25)',
    glowTertiary: 'rgba(0, 0, 0, 0.15)',
    
    gradientBackground: 'radial-gradient(ellipse at 50% 50%, #FFFFFF 0%, #FFFBEB 40%, #FEF3C7 100%)',
    gradientCard: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 251, 235, 0.9) 100%)',
    gradientGlow: 'radial-gradient(ellipse at 50% 50%, rgba(217, 119, 6, 0.15) 0%, rgba(219, 39, 119, 0.08) 30%, transparent 70%)',
    
    overlay: 'rgba(255, 251, 235, 0.95)',
    backdrop: 'rgba(255, 251, 235, 0.85)',
  },
  effects: {
    ...singularityDark.effects,
    shadowSmall: '0 2px 12px rgba(217, 119, 6, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)',
    shadowMedium: '0 4px 24px rgba(217, 119, 6, 0.2), 0 4px 12px rgba(0, 0, 0, 0.12)',
    shadowLarge: '0 8px 48px rgba(217, 119, 6, 0.25), 0 8px 24px rgba(0, 0, 0, 0.15)',
    shadowGlow: '0 0 40px rgba(217, 119, 6, 0.3), 0 0 80px rgba(217, 119, 6, 0.2), 0 0 120px rgba(219, 39, 119, 0.1)',
  },
};

// ============================================================================
// THEME REGISTRY
// ============================================================================

const themes: Record<ThemeMode, Record<ColorScheme, Theme>> = {
  cyber: { dark: cyberDark, light: cyberLight },
  pulse: { dark: pulseDark, light: pulseLight },
  aurora: { dark: auroraDark, light: auroraLight },
  singularity: { dark: singularityDark, light: singularityLight },
};

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

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [savedTheme, savedScheme] = await Promise.all([
        AsyncStorage.getItem('fl4sh_theme_mode'),
        AsyncStorage.getItem('fl4sh_color_scheme'),
      ]);
      
      if (savedTheme && themes[savedTheme as ThemeMode]) {
        setThemeModeState(savedTheme as ThemeMode);
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

  const theme = themes[themeMode][colorScheme];

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
        typography: theme.typography,
        isThemeUnlocked,
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

export { themes, themeUnlockXP };
export type { Theme, ThemeColors, ThemeEffects, ThemeTypography };
