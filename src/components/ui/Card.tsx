import React from 'react';
import { View, ViewStyle, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient' | 'minimal' | 'glass' | 'neon' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  style?: ViewStyle;
  pressable?: boolean;
  disabled?: boolean;
  glowEffect?: boolean;
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  shadow?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'colored';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  onPress,
  style,
  pressable = false,
  disabled = false,
  glowEffect = false,
  borderRadius = 'xl',
  shadow = 'md',
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);

  const getCardStyle = (): ViewStyle => {
    const sizeStyles = {
      xs: {
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: 60,
      },
      sm: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: 80,
      },
      md: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: 100,
      },
      lg: {
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: 140,
      },
      xl: {
        padding: theme.spacing.xxl,
        borderRadius: theme.borderRadius[borderRadius],
        minHeight: 180,
      },
    };

    const variantStyles = {
      default: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...(shadow !== 'none' && theme.shadows[shadow]),
      },
      elevated: {
        backgroundColor: theme.colors.surfaceElevated,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
        ...theme.shadows.lg,
        ...(glowEffect && theme.shadows.colored),
      },
      outlined: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.border,
        ...(shadow !== 'none' && theme.shadows[shadow]),
      },
      minimal: {
        backgroundColor: theme.colors.surface,
        borderWidth: 0,
        ...(shadow !== 'none' && theme.shadows[shadow]),
      },
      glass: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        ...theme.shadows.sm,
      },
      neon: {
        backgroundColor: theme.colors.background,
        borderWidth: 2,
        borderColor: theme.colors.accent,
        ...theme.shadows.colored,
      },
      soft: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
        ...theme.shadows.xs,
      },
      gradient: {
        borderWidth: 0,
        ...(shadow !== 'none' && theme.shadows[shadow]),
        ...(glowEffect && theme.shadows.colored),
      },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.6 : 1,
    };
  };

  if (variant === 'gradient') {
    const content = (
      <LinearGradient
        colors={theme.gradients.subtle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={getCardStyle()}
      >
        {children}
      </LinearGradient>
    );

    if (onPress || pressable) {
      return (
        <Pressable 
          onPress={onPress} 
          disabled={disabled}
          style={({ pressed }) => [
            style,
            {
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            }
          ]}
        >
          {content}
        </Pressable>
      );
    }

    return <View style={style}>{content}</View>;
  }

  if (onPress || pressable) {
    return (
      <Pressable 
        onPress={onPress} 
        disabled={disabled}
        style={({ pressed }) => [
          getCardStyle(),
          style,
          {
            opacity: pressed ? 0.8 : disabled ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            backgroundColor: pressed ? theme.colors.surfaceHover : getCardStyle().backgroundColor,
          }
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};