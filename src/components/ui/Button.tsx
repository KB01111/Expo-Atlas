import React from 'react';
import { Pressable, Text, View, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { MotiView } from '../animations';
import { useReducedMotion, useTestID } from '../../hooks/useAccessibility';
import type { AccessibleComponentProps } from '../../types/accessibility';
import { WCAG_GUIDELINES, SemanticRoles } from '../../types/accessibility';

interface ButtonProps extends AccessibleComponentProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'minimal' | 'glass' | 'neon' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  loadingText?: string;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
  glowEffect?: boolean;
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
  loadingText,
  hapticFeedback = 'light',
  glowEffect = false,
  borderRadius = 'xl',
  // Accessibility props
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = SemanticRoles.BUTTON,
  accessibilityState,
  testID,
  minTouchTarget = true,
  ...accessibilityProps
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const reduceMotion = useReducedMotion();
  const generateTestID = useTestID('button');

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      width: fullWidth ? '100%' : undefined,
    };

    const sizeStyles = {
      xs: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 32,
        minWidth: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 32,
      },
      sm: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 40,
        minWidth: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 40,
      },
      md: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: Math.max(48, minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 48),
        minWidth: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 48,
      },
      lg: {
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xxl,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: 56,
        minWidth: 56,
      },
      xl: {
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xxxl,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: 64,
        minWidth: 64,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.md,
        ...(glowEffect && theme.shadows.colored),
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
        ...theme.shadows.sm,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        ...(glowEffect && { borderColor: theme.colors.accent }),
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      minimal: {
        backgroundColor: theme.colors.surfaceHover,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
        ...theme.shadows.xs,
      },
      gradient: {
        ...theme.shadows.lg,
        ...(glowEffect && theme.shadows.colored),
      },
      glass: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        ...theme.shadows.sm,
      },
      neon: {
        backgroundColor: theme.colors.background,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        ...theme.shadows.colored,
      },
      soft: {
        backgroundColor: theme.colors.surfaceElevated,
        ...theme.shadows.sm,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles = {
      xs: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
      sm: { fontSize: 14, fontWeight: '600' as const, letterSpacing: 0.3 },
      md: { fontSize: 15, fontWeight: '600' as const, letterSpacing: 0.3 },
      lg: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
      xl: { fontSize: 17, fontWeight: '700' as const, letterSpacing: 0.4 },
    };

    const variantStyles = {
      primary: { color: '#FFFFFF', fontWeight: '600' as const },
      secondary: { color: '#FFFFFF', fontWeight: '600' as const },
      outline: { color: theme.colors.primary, fontWeight: '600' as const },
      ghost: { color: theme.colors.primary, fontWeight: '500' as const },
      minimal: { color: theme.colors.text, fontWeight: '500' as const },
      gradient: { color: '#FFFFFF', fontWeight: '700' as const },
      glass: { color: '#FFFFFF', fontWeight: '600' as const, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
      neon: { color: theme.colors.accent, fontWeight: '700' as const },
      soft: { color: theme.colors.text, fontWeight: '500' as const },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  const renderIcon = () => {
    if (!icon || loading) return null;
    return (
      <View style={{ 
        marginRight: iconPosition === 'left' && title ? theme.spacing.sm : 0,
        marginLeft: iconPosition === 'right' && title ? theme.spacing.sm : 0,
      }}>
        {icon}
      </View>
    );
  };

  const content = (
    <>
      {loading && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator
            size="small"
            color={variant === 'outline' || variant === 'ghost' || variant === 'minimal' ? theme.colors.primary : '#FFFFFF'}
            accessibilityLabel="Loading"
          />
          {(loadingText || title) && (
            <Text 
              style={[getTextStyle(), textStyle, { marginLeft: theme.spacing.sm }]}
              accessibilityLiveRegion="polite"
            >
              {loadingText || `Loading ${title.toLowerCase()}...`}
            </Text>
          )}
        </View>
      )}
      {!loading && (
        <>
          {iconPosition === 'left' && renderIcon()}
          {title && (
            <Text style={[getTextStyle(), textStyle]}>
              {title}
            </Text>
          )}
          {iconPosition === 'right' && renderIcon()}
        </>
      )}
    </>
  );

  // Accessibility props for Pressable
  const pressableAccessibilityProps = {
    accessibilityRole,
    accessibilityLabel: accessibilityLabel || title,
    accessibilityHint,
    accessibilityState: {
      disabled: disabled || loading,
      busy: loading,
      ...accessibilityState,
    },
    testID: testID || generateTestID(title),
    ...accessibilityProps,
  };

  if (variant === 'gradient') {
    return (
      <MotiView
        preset={reduceMotion ? 'none' : 'scaleIn'}
        tap={reduceMotion ? 'none' : 'scale'}
        hover={reduceMotion ? 'none' : 'lift'}
        style={style}
      >
        <Pressable 
          onPress={handlePress} 
          disabled={disabled || loading} 
          {...pressableAccessibilityProps}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.9 : disabled ? 0.6 : 1,
            }
          ]}
        >
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={getButtonStyle()}
          >
            {content}
          </LinearGradient>
        </Pressable>
      </MotiView>
    );
  }

  return (
    <MotiView
      preset={reduceMotion ? 'none' : 'scaleIn'}
      tap={reduceMotion ? 'none' : 'scale'}
      hover={reduceMotion ? 'none' : 'lift'}
      style={style}
    >
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        {...pressableAccessibilityProps}
        style={({ pressed }) => [
          getButtonStyle(),
          {
            opacity: pressed ? 0.8 : disabled ? 0.6 : 1,
            backgroundColor: pressed && variant !== 'ghost' && variant !== 'outline' 
              ? theme.colors.surfaceHover 
              : getButtonStyle().backgroundColor,
          }
        ]}
      >
        {content}
      </Pressable>
    </MotiView>
  );
};