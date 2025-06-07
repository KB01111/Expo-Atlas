import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeMode, AppTheme } from '../types';

interface ThemeContextType {
  theme: AppTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const lightTheme: AppTheme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#1E293B',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  gradients: {
    primary: ['#3B82F6', '#8B5CF6'],
    hero: ['#667EEA', '#764BA2', '#F093FB'],
  },
};

const darkTheme: AppTheme = {
  colors: {
    primary: '#60A5FA',
    secondary: '#A78BFA',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#334155',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
  },
  gradients: {
    primary: ['#60A5FA', '#A78BFA'],
    hero: ['#667EEA', '#764BA2', '#F093FB'],
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};