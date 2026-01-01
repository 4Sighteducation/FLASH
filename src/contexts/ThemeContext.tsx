import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'default' | 'pulse' | 'aurora' | 'singularity';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  gradient: readonly [string, string, string];
  cardGradient: readonly [string, string];
  buttonGradient: readonly [string, string];
}

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
}

// Theme palettes aligned to `assets/flash-themes.jsx` (RN adaptation).
const themes: Record<ThemeMode, ThemeColors> = {
  // "Cyber" in your design doc — keep key as "default" for internal compatibility.
  default: {
    primary: '#14b8a6',
    secondary: '#ec4899',
    background: '#0a0a0f',
    surface: 'rgba(20, 184, 166, 0.10)',
    text: '#ffffff',
    textSecondary: '#6b7280',
    border: 'rgba(20, 184, 166, 0.28)',
    accent: '#7c4dff',
    gradient: ['#0a0a0f', '#0d1117', '#111827'],
    cardGradient: ['#0d1117', '#111827'],
    buttonGradient: ['#14b8a6', '#ec4899'],
  },
  pulse: {
    primary: '#f97316',
    secondary: '#ef4444',
    background: '#0f0a0a',
    surface: 'rgba(249, 115, 22, 0.12)',
    text: '#fff7ed',
    textSecondary: '#a8a29e',
    border: 'rgba(249, 115, 22, 0.30)',
    accent: '#fbbf24',
    gradient: ['#0f0a0a', '#1c1412', '#2a1b16'],
    cardGradient: ['#1c1412', '#2a1b16'],
    buttonGradient: ['#f97316', '#ef4444'],
  },
  aurora: {
    primary: '#22d3ee',
    secondary: '#a855f7',
    background: '#050a14',
    surface: 'rgba(34, 211, 238, 0.10)',
    text: '#f0fdfa',
    textSecondary: '#94a3b8',
    border: 'rgba(34, 211, 238, 0.28)',
    accent: '#34d399',
    gradient: ['#050a14', '#0c1222', '#151B3A'],
    cardGradient: ['#0c1222', '#151B3A'],
    buttonGradient: ['#22d3ee', '#a855f7'],
  },
  singularity: {
    primary: '#fbbf24',
    secondary: '#f472b6',
    background: '#030206',
    surface: 'rgba(251, 191, 36, 0.10)',
    text: '#fefce8',
    textSecondary: '#a1a1aa',
    border: 'rgba(251, 191, 36, 0.26)',
    accent: '#ffffff',
    gradient: ['#030206', '#0a0812', '#0d1117'],
    cardGradient: ['#0a0812', '#0d1117'],
    buttonGradient: ['#fbbf24', '#f472b6'],
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('default');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (!savedTheme) return;

      // Backwards compatibility: older builds stored "cyber"
      if (savedTheme === 'cyber') {
        setTheme('default');
        return;
      }

      if (savedTheme === 'default' || savedTheme === 'pulse' || savedTheme === 'aurora' || savedTheme === 'singularity') {
        setTheme(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setThemeMode = async (next: ThemeMode) => {
    setTheme(next);
    try {
      await AsyncStorage.setItem('appTheme', next);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: themes[theme], setTheme: setThemeMode }}>
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