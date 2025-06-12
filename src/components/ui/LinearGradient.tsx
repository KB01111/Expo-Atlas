import React from 'react';
import { Platform, View, ViewStyle } from 'react-native';

interface LinearGradientProps {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const LinearGradient: React.FC<LinearGradientProps> = ({
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  style,
  children,
}) => {
  if (Platform.OS === 'web') {
    // Web implementation using CSS gradient
    const webStyle: ViewStyle & { background?: string } = {
      ...style,
      background: `linear-gradient(${Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI}deg, ${colors.join(', ')})`,
    };
    
    return <View style={webStyle}>{children}</View>;
  }

  // Native implementation
  try {
    const { LinearGradient: ExpoLinearGradient } = require('expo-linear-gradient');
    return (
      <ExpoLinearGradient colors={colors} start={start} end={end} style={style}>
        {children}
      </ExpoLinearGradient>
    );
  } catch (error) {
    // Fallback if expo-linear-gradient is not available
    return <View style={style}>{children}</View>;
  }
};