import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getStatusColor } from '../../styles/shared';
import { useTestID } from '../../hooks/useAccessibility';
import type { AccessibleComponentProps } from '../../types/accessibility';
import { WCAG_GUIDELINES, SemanticRoles } from '../../types/accessibility';

interface StatusBadgeProps extends AccessibleComponentProps {
  status: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'filled' | 'outlined' | 'subtle' | 'glass' | 'neon' | 'gradient';
  style?: ViewStyle;
  textStyle?: TextStyle;
  showIcon?: boolean;
  customIcon?: keyof typeof Ionicons.glyphMap;
  customColor?: string;
  pulsing?: boolean;
  glowEffect?: boolean;
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  variant = 'filled',
  style,
  textStyle,
  showIcon = true,
  customIcon,
  customColor,
  pulsing = false,
  glowEffect = false,
  borderRadius = 'full',
  // Accessibility props
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = SemanticRoles.TEXT,
  testID,
  minTouchTarget = false,
  ...accessibilityProps
}) => {
  const { theme } = useTheme();
  const generateTestID = useTestID('status-badge');
  const statusColor = getStatusColor(status, theme);

  // Icon mapping for different status types
  const getStatusIcon = (): keyof typeof Ionicons.glyphMap | null => {
    if (customIcon) return customIcon;
    
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      active: 'checkmark-circle',
      completed: 'checkmark-circle',
      success: 'checkmark-circle',
      inactive: 'pause-circle',
      pending: 'time',
      warning: 'warning',
      error: 'close-circle',
      failed: 'close-circle',
      running: 'play-circle',
      in_progress: 'refresh-circle',
    };
    
    return iconMap[status.toLowerCase()] || null;
  };

  const getSizeStyles = () => {
    const baseMinSize = minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 'auto';
    
    const sizes = {
      xs: {
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius[borderRadius],
        fontSize: 10,
        fontWeight: '600' as const,
        minHeight: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 16,
        minWidth: baseMinSize,
        gap: 2,
        iconSize: 10,
      },
      sm: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius[borderRadius],
        fontSize: 11,
        fontWeight: '600' as const,
        minHeight: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 20,
        minWidth: baseMinSize,
        gap: 4,
        iconSize: 12,
      },
      md: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius[borderRadius],
        fontSize: 12,
        fontWeight: '600' as const,
        minHeight: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 24,
        minWidth: baseMinSize,
        gap: 6,
        iconSize: 14,
      },
      lg: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius[borderRadius],
        fontSize: 14,
        fontWeight: '600' as const,
        minHeight: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 32,
        minWidth: baseMinSize,
        gap: 8,
        iconSize: 16,
      },
      xl: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
        borderRadius: theme.borderRadius[borderRadius],
        fontSize: 16,
        fontWeight: '700' as const,
        minHeight: minTouchTarget ? WCAG_GUIDELINES.MIN_TOUCH_TARGET : 40,
        minWidth: baseMinSize,
        gap: 10,
        iconSize: 18,
      },
    };
    return sizes[size];
  };

  const getVariantStyles = (): { container: any; text: any } => {
    const sizeStyles = getSizeStyles();
    const finalColor = customColor || statusColor;
    
    const baseContainer = {
      paddingHorizontal: sizeStyles.paddingHorizontal,
      paddingVertical: sizeStyles.paddingVertical,
      borderRadius: sizeStyles.borderRadius,
      ...(glowEffect && theme.shadows.colored),
    };

    const baseText = {
      fontSize: sizeStyles.fontSize,
      fontWeight: sizeStyles.fontWeight,
      textTransform: 'capitalize' as const,
    };
    
    switch (variant) {
      case 'filled':
        return {
          container: {
            ...baseContainer,
            backgroundColor: finalColor,
            ...theme.shadows.xs,
          },
          text: {
            ...baseText,
            color: '#FFFFFF',
          },
        };
      
      case 'outlined':
        return {
          container: {
            ...baseContainer,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: finalColor,
          },
          text: {
            ...baseText,
            color: finalColor,
          },
        };
      
      case 'subtle':
        return {
          container: {
            ...baseContainer,
            backgroundColor: `${finalColor}15`,
            borderWidth: 1,
            borderColor: `${finalColor}30`,
          },
          text: {
            ...baseText,
            color: finalColor,
          },
        };

      case 'glass':
        return {
          container: {
            ...baseContainer,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            ...theme.shadows.sm,
          },
          text: {
            ...baseText,
            color: '#FFFFFF',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          },
        };

      case 'neon':
        return {
          container: {
            ...baseContainer,
            backgroundColor: theme.colors.background,
            borderWidth: 2,
            borderColor: finalColor,
            ...theme.shadows.colored,
          },
          text: {
            ...baseText,
            color: finalColor,
            fontWeight: '700' as const,
          },
        };

      case 'gradient':
        return {
          container: {
            ...baseContainer,
            backgroundColor: 'transparent',
            ...theme.shadows.sm,
          },
          text: {
            ...baseText,
            color: '#FFFFFF',
            fontWeight: '700' as const,
          },
        };
      
      default:
        return {
          container: baseContainer,
          text: baseText,
        };
    }
  };

  const styles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const icon = getStatusIcon();
  
  // Format status text for display
  const formatStatus = (status: string): string => {
    return status.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          flexDirection: 'row', 
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: sizeStyles.minHeight,
          minWidth: sizeStyles.minWidth,
          gap: sizeStyles.gap,
        }, 
        style
      ]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || `Status: ${formatStatus(status)}`}
      accessibilityHint={accessibilityHint}
      testID={testID || generateTestID(status)}
      {...accessibilityProps}
    >
      {showIcon && icon && (
        <Ionicons 
          name={icon} 
          size={sizeStyles.iconSize} 
          color={styles.text.color}
          accessibilityElementsHidden={true}
        />
      )}
      <Text 
        style={[styles.text, textStyle]}
        accessibilityElementsHidden={true}
      >
        {formatStatus(status)}
      </Text>
    </View>
  );
};