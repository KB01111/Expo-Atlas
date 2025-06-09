import React from 'react';
import { View, ViewStyle, TouchableOpacity, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient' | 'minimal' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  style?: ViewStyle;
  pressable?: boolean;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  onPress,
  style,
  pressable = false,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);

  const getCardStyle = (): ViewStyle => {
    const sizeStyles = {
      xs: {
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
      },
      sm: {
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
      },
      md: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
      },
      lg: {
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.xxl,
      },
      xl: {
        padding: theme.spacing.xxl,
        borderRadius: theme.borderRadius.xxl,
      },
    };

    const variantStyles = {
      default: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      },
      elevated: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.lg,
      },
      outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.border,
      },
      minimal: {
        backgroundColor: theme.colors.surface,
        borderWidth: 0,
      },
      glass: {
        backgroundColor: `${theme.colors.surface}E6`,
        borderWidth: 1,
        borderColor: `${theme.colors.border}80`,
        backdropFilter: 'blur(10px)',
        ...theme.shadows.md,
      },
      gradient: {
        borderWidth: 0,
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