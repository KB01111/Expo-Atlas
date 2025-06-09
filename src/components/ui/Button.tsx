import React from 'react';
import { Pressable, Text, View, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { MotiView } from '../animations';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient' | 'minimal';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
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
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);

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
        borderRadius: theme.borderRadius.lg,
        minHeight: 36,
      },
      sm: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
        minHeight: 42,
      },
      md: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.xl,
        minHeight: 48,
      },
      lg: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.xl,
        minHeight: 54,
      },
      xl: {
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.xxl,
        borderRadius: theme.borderRadius.xxl,
        minHeight: 60,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.md,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
        ...theme.shadows.md,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      minimal: {
        backgroundColor: theme.colors.surfaceHover,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      gradient: {
        ...theme.shadows.md,
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
      primary: { color: '#FFFFFF' },
      secondary: { color: '#FFFFFF' },
      outline: { color: theme.colors.primary },
      ghost: { color: theme.colors.primary },
      minimal: { color: theme.colors.text },
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
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' || variant === 'minimal' ? theme.colors.primary : '#FFFFFF'}
          style={{ marginRight: title ? theme.spacing.sm : 0 }}
        />
      )}
      {iconPosition === 'left' && renderIcon()}
      {title && (
        <Text style={[getTextStyle(), textStyle]}>
          {title}
        </Text>
      )}
      {iconPosition === 'right' && renderIcon()}
    </>
  );

  if (variant === 'gradient') {
    return (
      <MotiView
        preset="scaleIn"
        tap="scale"
        hover="lift"
        style={style}
      >
        <Pressable 
          onPress={handlePress} 
          disabled={disabled || loading} 
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
      preset="scaleIn"
      tap="scale"
      hover="lift"
      style={style}
    >
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
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