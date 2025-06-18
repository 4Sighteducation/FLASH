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
    primary: '#00D4FF',
    secondary: '#00B4E6',
    background: '#0F172A',
    surface: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff',
    textSecondary: '#94A3B8',
    border: 'rgba(255, 255, 255, 0.2)',
    accent: '#10B981',
    gradient: ['#0F172A', '#1E293B', '#334155'],
    cardGradient: ['#1E293B', '#334155'],
    buttonGradient: ['#00D4FF', '#00B4E6'],
  },
  cyber: {
    primary: '#00FF88',
    secondary: '#FF0080',
    background: '#000000',
    surface: 'rgba(0, 255, 136, 0.1)',
    text: '#00FF88',
    textSecondary: '#FF0080',
    border: 'rgba(0, 255, 136, 0.3)',
    accent: '#FFFF00',
    gradient: ['#000000', '#0A0A0A', '#1A0A1A'],
    cardGradient: ['#1A0A1A', '#2A0A2A'],
    buttonGradient: ['#00FF88', '#00CC66'],
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