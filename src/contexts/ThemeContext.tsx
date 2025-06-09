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
    primary: '#4F46E5', // Indigo-600 - Premium brand color
    secondary: '#06B6D4', // Cyan-500 - Fresh modern accent
    background: '#FFFFFF', // Pure white for premium feel
    surface: '#FFFFFF', // Clean white surfaces
    text: '#0F172A', // Slate-900 - Deep readable text
    textSecondary: '#64748B', // Slate-500 - Professional gray
    border: '#F1F5F9', // Slate-100 - Ultra-subtle borders
    error: '#DC2626', // Red-600 - Professional error
    success: '#059669', // Emerald-600 - Rich success green
    warning: '#D97706', // Amber-600 - Warm warning
    accent: '#7C3AED', // Violet-600 - Elegant purple
    info: '#0284C7', // Sky-600 - Professional blue
    surfaceHover: '#F8FAFC', // Slate-50 - Subtle hover
    overlay: 'rgba(15, 23, 42, 0.6)', // Sophisticated overlay
  },
  gradients: {
    primary: ['#4F46E5', '#7C3AED', '#06B6D4'] as const,
    hero: ['#4F46E5', '#7C3AED', '#06B6D4'] as const,
    card: ['#FFFFFF', '#FFFFFF'] as const,
    subtle: ['#F8FAFC', '#FFFFFF'] as const,
    accent: ['#06B6D4', '#4F46E5'] as const,
    warm: ['#F59E0B', '#EF4444'] as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  borderRadius: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    xxl: 16,
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
    primary: '#6366F1', // Indigo-500 - Vibrant but professional
    secondary: '#22D3EE', // Cyan-400 - Bright modern accent
    background: '#0F172A', // Slate-900 - Rich deep background
    surface: '#1E293B', // Slate-800 - Elevated surfaces
    text: '#F8FAFC', // Slate-50 - Crisp white text
    textSecondary: '#94A3B8', // Slate-400 - Balanced secondary
    border: '#334155', // Slate-700 - Defined borders
    error: '#EF4444', // Red-500 - Clear error indication
    success: '#10B981', // Emerald-500 - Vibrant success
    warning: '#F59E0B', // Amber-500 - Clear warning
    accent: '#8B5CF6', // Violet-500 - Rich purple accent
    info: '#3B82F6', // Blue-500 - Professional info
    surfaceHover: '#334155', // Slate-700 - Interactive feedback
    overlay: 'rgba(15, 23, 42, 0.8)', // Deep sophisticated overlay
  },
  gradients: {
    primary: ['#6366F1', '#8B5CF6', '#22D3EE'] as const,
    hero: ['#6366F1', '#8B5CF6', '#22D3EE'] as const,
    card: ['#1E293B', '#334155'] as const,
    subtle: ['#0F172A', '#1E293B'] as const,
    accent: ['#22D3EE', '#6366F1'] as const,
    warm: ['#F59E0B', '#EF4444'] as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  borderRadius: {
    xs: 2,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    xxl: 16,
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