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
    primary: '#6366F1', // Indigo-500 - Modern and vibrant
    secondary: '#EC4899', // Pink-500 - Complementary accent
    background: '#FAFBFC', // Slightly warmer white
    surface: '#FFFFFF', // Pure white for cards
    text: '#111827', // Gray-900 - Better contrast
    textSecondary: '#6B7280', // Gray-500 - Softer secondary text
    border: '#E5E7EB', // Gray-200 - Subtle borders
    error: '#EF4444', // Red-500
    success: '#10B981', // Emerald-500
    warning: '#F59E0B', // Amber-500
    accent: '#8B5CF6', // Violet-500
    info: '#3B82F6', // Blue-500
    surfaceHover: '#F9FAFB', // Gray-50
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  gradients: {
    primary: ['#6366F1', '#8B5CF6', '#EC4899'] as const,
    hero: ['#667EEA', '#764BA2', '#F093FB'] as const,
    card: ['#FFFFFF', '#F8FAFC'] as const,
    subtle: ['#F9FAFB', '#FFFFFF'] as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
  },
};

const darkTheme: AppTheme = {
  colors: {
    primary: '#818CF8', // Indigo-400 - Lighter for dark mode
    secondary: '#F472B6', // Pink-400 - Lighter pink accent
    background: '#0B1426', // Deep navy - More sophisticated than pure black
    surface: '#1E293B', // Slate-800 - Rich card background
    text: '#F8FAFC', // Slate-50 - Clean white text
    textSecondary: '#94A3B8', // Slate-400 - Muted secondary
    border: '#334155', // Slate-700 - Subtle borders
    error: '#F87171', // Red-400
    success: '#34D399', // Emerald-400
    warning: '#FBBF24', // Amber-400
    accent: '#A78BFA', // Violet-400
    info: '#60A5FA', // Blue-400
    surfaceHover: '#334155', // Slate-700
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  gradients: {
    primary: ['#818CF8', '#A78BFA', '#F472B6'] as const,
    hero: ['#667EEA', '#764BA2', '#F093FB'] as const,
    card: ['#1E293B', '#334155'] as const,
    subtle: ['#0F172A', '#1E293B'] as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12,
    },
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