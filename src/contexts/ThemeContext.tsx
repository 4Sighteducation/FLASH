import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'default' | 'cyber';

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
  toggleTheme: () => void;
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
      if (savedTheme && (savedTheme === 'default' || savedTheme === 'cyber')) {
        setTheme(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'default' ? 'cyber' : 'default';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('appTheme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: themes[theme], toggleTheme }}>
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