import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      ...theme.shadows.sm,
    };

    const sizeStyles = {
      sm: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        minHeight: 36,
      },
      md: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        minHeight: 44,
      },
      lg: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.xl,
        minHeight: 52,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      gradient: {
        // Will be handled by LinearGradient
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizeStyles = {
      sm: { fontSize: 14, fontWeight: '600' as const },
      md: { fontSize: 16, fontWeight: '600' as const },
      lg: { fontSize: 18, fontWeight: '700' as const },
    };

    const variantStyles = {
      primary: { color: '#FFFFFF' },
      secondary: { color: '#FFFFFF' },
      outline: { color: theme.colors.primary },
      ghost: { color: theme.colors.primary },
      gradient: { color: '#FFFFFF' },
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

  const content = (
    <>
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : '#FFFFFF'}
          style={{ marginRight: icon || title ? theme.spacing.sm : 0 }}
        />
      )}
      {icon && !loading && (
        <div style={{ marginRight: title ? theme.spacing.sm : 0 }}>
          {icon}
        </div>
      )}
      {title && (
        <Text style={[getTextStyle(), textStyle]}>
          {title}
        </Text>
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={disabled || loading} style={style}>
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={getButtonStyle()}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
    >
      {content}
    </TouchableOpacity>
  );
};