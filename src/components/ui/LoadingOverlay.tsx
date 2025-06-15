import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { MotiView } from '../animations';
import { useReducedMotion } from '../../hooks/useAccessibility';
import type { AccessibleComponentProps } from '../../types/accessibility';
import { SemanticRoles } from '../../types/accessibility';

interface LoadingOverlayProps extends AccessibleComponentProps {
  visible: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  backdrop?: boolean;
  transparent?: boolean;
  style?: ViewStyle;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  size = 'medium',
  backdrop = true,
  transparent = false,
  style,
  // Accessibility props
  accessibilityLabel,
  accessibilityHint,
  testID = 'loading-overlay',
  ...accessibilityProps
}) => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const reduceMotion = useReducedMotion();

  if (!visible) return null;

  const getSizeConfig = () => {
    const configs = {
      small: {
        spinnerSize: 'small' as const,
        fontSize: 14,
        spacing: theme.spacing.sm,
        containerSize: 80,
      },
      medium: {
        spinnerSize: 'large' as const,
        fontSize: 16,
        spacing: theme.spacing.md,
        containerSize: 120,
      },
      large: {
        spinnerSize: 'large' as const,
        fontSize: 18,
        spacing: theme.spacing.lg,
        containerSize: 160,
      },
    };
    return configs[size];
  };

  const config = getSizeConfig();

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: backdrop 
        ? transparent 
          ? 'transparent' 
          : theme.colors.overlay
        : 'transparent',
      zIndex: 9999,
    },
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: config.containerSize,
      minHeight: config.containerSize,
      ...theme.shadows.lg,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: config.spacing,
    },
    message: {
      fontSize: config.fontSize,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: config.spacing,
      maxWidth: 200,
    },
    transparentContainer: {
      backgroundColor: 'transparent',
      shadowOpacity: 0,
      elevation: 0,
    },
  });

  const LoadingContent = () => (
    <View 
      style={[
        styles.container, 
        transparent && styles.transparentContainer
      ]}
      accessibilityRole={SemanticRoles.TEXT}
      accessibilityLabel={accessibilityLabel || `Loading: ${message}`}
      accessibilityHint={accessibilityHint || 'Please wait while content is loading'}
      accessibilityLiveRegion="polite"
      testID={testID}
      {...accessibilityProps}
    >
      <View style={styles.content}>
        <ActivityIndicator
          size={config.spinnerSize}
          color={theme.colors.primary}
          accessibilityElementsHidden={true}
        />
        {message && (
          <Text 
            style={styles.message}
            accessibilityElementsHidden={true}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View 
      style={[styles.overlay, style]}
      pointerEvents={backdrop ? 'auto' : 'none'}
    >
      {reduceMotion ? (
        <LoadingContent />
      ) : (
        <MotiView 
          preset="fadeIn"
          style={{ alignItems: 'center', justifyContent: 'center' }}
        >
          <LoadingContent />
        </MotiView>
      )}
    </View>
  );
};