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
    // Original color scheme
    primary: '#4F46E5', // Indigo
    primaryDark: '#3730A3', // Darker indigo
    secondary: '#06B6D4', // Cyan
    secondaryDark: '#0891B2', // Darker cyan
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceElevated: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    accent: '#8B5CF6',
    info: '#3B82F6',
    surfaceHover: '#F1F5F9',
    overlay: 'rgba(0, 0, 0, 0.5)',
    // Semantic colors for better UX
    backgroundSecondary: '#F8FAFC',
    surfaceDisabled: '#F1F5F9',
    textDisabled: '#CBD5E1',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
  },
  gradients: {
    primary: ['#4F46E5', '#7C3AED'] as const, // Indigo to purple
    secondary: ['#06B6D4', '#3B82F6'] as const, // Cyan to blue
    hero: ['#4F46E5', '#7C3AED', '#EC4899'] as const, // Multi-color hero
    card: ['#FFFFFF', '#F8FAFC'] as const,
    subtle: ['#F8FAFC', '#FFFFFF'] as const,
    accent: ['#8B5CF6', '#7C3AED'] as const,
    warm: ['#F59E0B', '#EF4444'] as const,
    cool: ['#3B82F6', '#06B6D4'] as const,
    success: ['#10B981', '#059669'] as const,
    glass: ['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.1)'] as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    xxxxl: 64,
  },
  typography: {
    // Display typography
    displayLarge: { fontSize: 57, fontWeight: '900', lineHeight: 64, letterSpacing: -0.25 },
    displayMedium: { fontSize: 45, fontWeight: '900', lineHeight: 52, letterSpacing: 0 },
    displaySmall: { fontSize: 36, fontWeight: '900', lineHeight: 44, letterSpacing: 0 },
    
    // Headline typography
    headlineLarge: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: 0 },
    headlineMedium: { fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: 0 },
    headlineSmall: { fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: 0 },
    
    // Title typography
    titleLarge: { fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: 0 },
    titleMedium: { fontSize: 18, fontWeight: '600', lineHeight: 24, letterSpacing: 0.15 },
    titleSmall: { fontSize: 16, fontWeight: '600', lineHeight: 20, letterSpacing: 0.1 },
    
    // Body typography
    bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: 0.25 },
    bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.4 },
    
    // Label typography
    labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
    labelSmall: { fontSize: 10, fontWeight: '500', lineHeight: 14, letterSpacing: 0.5 },
  },
  layout: {
    // Consistent layout spacing
    screenPadding: 24,
    screenPaddingSmall: 16,
    cardPadding: 20,
    cardPaddingSmall: 16,
    listItemPadding: 16,
    sectionSpacing: 32,
    itemSpacing: 16,
    
    // Component sizes
    buttonHeight: 48,
    buttonHeightSmall: 40,
    buttonHeightLarge: 56,
    inputHeight: 48,
    headerHeight: 60,
    tabBarHeight: 84,
    
    // Grid system
    gridGutter: 16,
    gridMargin: 24,
    maxContentWidth: 768,
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
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#667EEA',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
    colored: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

const darkTheme: AppTheme = {
  colors: {
    // Original dark theme
    primary: '#6366F1', // Indigo
    primaryDark: '#4F46E5', // Darker indigo
    secondary: '#06B6D4', // Cyan
    secondaryDark: '#0891B2', // Darker cyan
    background: '#0D1117', // GitHub-inspired dark background
    surface: '#161B22', // Elevated dark surface
    surfaceElevated: '#21262D', // Higher elevation surface
    text: '#F0F6FC', // Crisp light text
    textSecondary: '#8B949E', // Balanced secondary text
    textTertiary: '#6E7681', // Subtle tertiary text
    border: '#30363D', // Soft dark borders
    borderLight: '#21262D', // Ultra-subtle borders
    error: '#F85149', // Modern bright error red
    success: '#56D364', // Fresh success green
    warning: '#E3B341', // Warm warning amber
    accent: '#A5A6F6', // Light purple accent
    info: '#58A6FF', // Clear info blue
    surfaceHover: '#21262D', // Subtle hover state
    overlay: 'rgba(13, 17, 23, 0.8)', // Modern dark overlay
    // New semantic colors for dark mode
    backgroundSecondary: '#161B22',
    surfaceDisabled: '#21262D',
    textDisabled: '#484F58',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  gradients: {
    primary: ['#7C3AED', '#5B21B6'] as const, // Rich purple gradient
    secondary: ['#EC4899', '#BE185D'] as const, // Vibrant pink gradient
    hero: ['#7C3AED', '#EC4899', '#58A6FF'] as const, // Multi-color hero
    card: ['#161B22', '#21262D'] as const, // Subtle dark card
    subtle: ['#0D1117', '#161B22'] as const, // Dark background gradient
    accent: ['#A5A6F6', '#7C3AED'] as const, // Light-dark purple
    warm: ['#E3B341', '#F85149'] as const, // Warm amber-red
    cool: ['#58A6FF', '#7C3AED'] as const, // Cool blue-purple
    success: ['#56D364', '#2EA043'] as const, // Success green gradient
    glass: ['rgba(22, 27, 34, 0.8)', 'rgba(22, 27, 34, 0.4)'] as const, // Dark glassmorphism
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    xxxxl: 64,
  },
  typography: {
    // Display typography
    displayLarge: { fontSize: 57, fontWeight: '900', lineHeight: 64, letterSpacing: -0.25 },
    displayMedium: { fontSize: 45, fontWeight: '900', lineHeight: 52, letterSpacing: 0 },
    displaySmall: { fontSize: 36, fontWeight: '900', lineHeight: 44, letterSpacing: 0 },
    
    // Headline typography
    headlineLarge: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: 0 },
    headlineMedium: { fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: 0 },
    headlineSmall: { fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: 0 },
    
    // Title typography
    titleLarge: { fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: 0 },
    titleMedium: { fontSize: 18, fontWeight: '600', lineHeight: 24, letterSpacing: 0.15 },
    titleSmall: { fontSize: 16, fontWeight: '600', lineHeight: 20, letterSpacing: 0.1 },
    
    // Body typography
    bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20, letterSpacing: 0.25 },
    bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.4 },
    
    // Label typography
    labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: 0.1 },
    labelMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0.5 },
    labelSmall: { fontSize: 10, fontWeight: '500', lineHeight: 14, letterSpacing: 0.5 },
  },
  layout: {
    // Consistent layout spacing
    screenPadding: 24,
    screenPaddingSmall: 16,
    cardPadding: 20,
    cardPaddingSmall: 16,
    listItemPadding: 16,
    sectionSpacing: 32,
    itemSpacing: 16,
    
    // Component sizes
    buttonHeight: 48,
    buttonHeightSmall: 40,
    buttonHeightLarge: 56,
    inputHeight: 48,
    headerHeight: 60,
    tabBarHeight: 84,
    
    // Grid system
    gridGutter: 16,
    gridMargin: 24,
    maxContentWidth: 768,
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
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.4,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 12,
    },
    colored: {
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 6,
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