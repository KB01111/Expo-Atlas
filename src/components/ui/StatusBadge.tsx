import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getStatusColor } from '../../styles/shared';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'subtle';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  variant = 'filled',
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const statusColor = getStatusColor(status, theme);

  const getSizeStyles = () => {
    const sizes = {
      sm: {
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        fontSize: 10,
      },
      md: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        fontSize: 12,
      },
      lg: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        fontSize: 14,
      },
    };
    return sizes[size];
  };

  const getVariantStyles = () => {
    const sizeStyles = getSizeStyles();
    
    switch (variant) {
      case 'filled':
        return {
          container: {
            backgroundColor: statusColor,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical: sizeStyles.paddingVertical,
            borderRadius: sizeStyles.borderRadius,
          },
          text: {
            color: '#FFFFFF',
            fontSize: sizeStyles.fontSize,
            fontWeight: '600' as const,
            textTransform: 'capitalize' as const,
          },
        };
      case 'outlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: statusColor,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical: sizeStyles.paddingVertical,
            borderRadius: sizeStyles.borderRadius,
          },
          text: {
            color: statusColor,
            fontSize: sizeStyles.fontSize,
            fontWeight: '600' as const,
            textTransform: 'capitalize' as const,
          },
        };
      case 'subtle':
        return {
          container: {
            backgroundColor: `${statusColor}20`,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical: sizeStyles.paddingVertical,
            borderRadius: sizeStyles.borderRadius,
          },
          text: {
            color: statusColor,
            fontSize: sizeStyles.fontSize,
            fontWeight: '600' as const,
            textTransform: 'capitalize' as const,
          },
        };
      default:
        return getVariantStyles();
    }
  };

  const styles = getVariantStyles();

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.text, textStyle]}>
        {status}
      </Text>
    </View>
  );
};