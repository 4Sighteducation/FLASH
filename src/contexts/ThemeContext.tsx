import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'default' | 'cyber' | 'pulse' | 'aurora' | 'singularity';

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
  // Back-compat for older UI: toggles default <-> cyber
  toggleTheme: () => void;
  // New: select a specific theme (Profile uses this)
  setTheme: (newTheme: ThemeMode) => void;
}

const themes: Record<ThemeMode, ThemeColors> = {
  default: {
    primary: '#00F5FF',        // Updated to match new branding
    secondary: '#FF006E',      // Updated to match new branding
    background: '#0a0f1e',     // Updated to match new darker background
    surface: 'rgba(0, 245, 255, 0.08)',
    text: '#ffffff',
    textSecondary: '#94A3B8',
    border: 'rgba(0, 245, 255, 0.25)',
    accent: '#FF006E',         // Pink accent
    gradient: ['#0a0f1e', '#0F172A', '#1E293B'],
    cardGradient: ['#1E293B', '#334155'],
    buttonGradient: ['#00F5FF', '#00D4FF'],  // Cyan gradient
  },
  cyber: {
    primary: '#00F5FF',        // Cyan - matches new FL4SH branding
    secondary: '#FF006E',      // Pink - matches new FL4SH branding  
    background: '#0a0f1e',     // Dark blue-black
    surface: 'rgba(0, 245, 255, 0.1)',
    text: '#ffffff',
    textSecondary: '#94A3B8',
    border: 'rgba(0, 245, 255, 0.3)',
    accent: '#FF006E',         // Pink accent
    gradient: ['#0a0f1e', '#1a1035', '#2a1550'],  // Dark purple gradient
    cardGradient: ['#1a1035', '#2a1550'],
    buttonGradient: ['#00F5FF', '#FF006E'],  // Cyan to pink gradient
  },
  pulse: {
    primary: '#FF006E',
    secondary: '#00F5FF',
    background: '#1a0a1e',
    surface: 'rgba(255, 0, 110, 0.10)',
    text: '#ffffff',
    textSecondary: '#FFC0CB',
    border: 'rgba(255, 0, 110, 0.30)',
    accent: '#00F5FF',
    gradient: ['#1a0a1e', '#2a0f2e', '#3a143e'],
    cardGradient: ['#2a0f2e', '#3a143e'],
    buttonGradient: ['#FF006E', '#FF4081'],
  },
  aurora: {
    primary: '#A855F7',
    secondary: '#00F5FF',
    background: '#0f0a1e',
    surface: 'rgba(168, 85, 247, 0.10)',
    text: '#ffffff',
    textSecondary: '#DDA0DD',
    border: 'rgba(168, 85, 247, 0.30)',
    accent: '#00F5FF',
    gradient: ['#0f0a1e', '#1f143e', '#2f1e5e'],
    cardGradient: ['#1f143e', '#2f1e5e'],
    buttonGradient: ['#A855F7', '#C084FC'],
  },
  singularity: {
    primary: '#00F5FF',
    secondary: '#FF006E',
    background: '#000000',
    surface: 'rgba(0, 245, 255, 0.15)',
    text: '#00F5FF',
    textSecondary: '#00D4FF',
    border: 'rgba(0, 245, 255, 0.50)',
    accent: '#FF006E',
    gradient: ['#000000', '#000000', '#000000'],
    cardGradient: ['#000000', '#0a0f1e'],
    buttonGradient: ['#00F5FF', '#FF006E'],
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
      if (savedTheme && themes[savedTheme as ThemeMode]) {
        setTheme(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const handleSetTheme = async (newTheme: ThemeMode) => {
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('appTheme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme: ThemeMode = theme === 'default' ? 'cyber' : 'default';
    await handleSetTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: themes[theme], toggleTheme, setTheme: handleSetTheme }}>
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