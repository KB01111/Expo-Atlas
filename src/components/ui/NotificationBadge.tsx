import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  maxCount?: number;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  size = 'medium',
  color,
  textColor,
  maxCount = 99
}) => {
  const { theme } = useTheme();

  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  const sizeStyles = {
    small: { width: 16, height: 16, borderRadius: 8 },
    medium: { width: 20, height: 20, borderRadius: 10 },
    large: { width: 24, height: 24, borderRadius: 12 }
  };

  const fontSizes = {
    small: 10,
    medium: 12,
    large: 14
  };

  return (
    <View style={[
      styles.badge,
      sizeStyles[size],
      { backgroundColor: color || theme.colors.error }
    ]}>
      <Text style={[
        styles.text,
        {
          fontSize: fontSizes[size],
          color: textColor || '#FFFFFF'
        }
      ]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 20,
  },
  text: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default NotificationBadge;