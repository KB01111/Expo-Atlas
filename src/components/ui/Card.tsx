import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  onPress,
  style,
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);

  const getCardStyle = (): ViewStyle => {
    const sizeStyles = {
      sm: {
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
      },
      md: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
      },
      lg: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
      },
    };

    const variantStyles = {
      default: {
        backgroundColor: theme.colors.surface,
        ...theme.shadows.sm,
      },
      elevated: {
        backgroundColor: theme.colors.surface,
        ...theme.shadows.lg,
      },
      outlined: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      gradient: {
        // Will be handled by LinearGradient
      },
    };

    return {
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  if (variant === 'gradient') {
    const content = (
      <LinearGradient
        colors={theme.gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={getCardStyle()}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} style={style}>
          {content}
        </TouchableOpacity>
      );
    }

    return <View style={style}>{content}</View>;
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={[getCardStyle(), style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};