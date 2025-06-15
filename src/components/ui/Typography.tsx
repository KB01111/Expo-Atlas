import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface TypographyProps {
  children: React.ReactNode;
  variant?: 
    | 'displayLarge' | 'displayMedium' | 'displaySmall'
    | 'headlineLarge' | 'headlineMedium' | 'headlineSmall'
    | 'titleLarge' | 'titleMedium' | 'titleSmall'
    | 'bodyLarge' | 'bodyMedium' | 'bodySmall'
    | 'labelLarge' | 'labelMedium' | 'labelSmall';
  color?: 'primary' | 'secondary' | 'text' | 'textSecondary' | 'error' | 'success' | 'warning' | 'accent' | 'info';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
  testID?: string;
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'bodyMedium',
  color = 'text',
  style,
  numberOfLines,
  ellipsizeMode,
  selectable = false,
  testID,
}) => {
  const { theme } = useTheme();

  const getTextStyle = (): StyleProp<TextStyle> => {
    const baseStyle = theme.typography[variant];
    const colorStyle = { color: theme.colors[color] };

    return [baseStyle, colorStyle, style];
  };

  return (
    <Text
      style={getTextStyle()}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      selectable={selectable}
      testID={testID}
    >
      {children}
    </Text>
  );
};

// Convenience components for common use cases
export const DisplayText: React.FC<Omit<TypographyProps, 'variant'> & { size?: 'large' | 'medium' | 'small' }> = ({ 
  size = 'medium', 
  ...props 
}) => (
  <Typography variant={`display${size.charAt(0).toUpperCase() + size.slice(1)}` as any} {...props} />
);

export const HeadlineText: React.FC<Omit<TypographyProps, 'variant'> & { size?: 'large' | 'medium' | 'small' }> = ({ 
  size = 'medium', 
  ...props 
}) => (
  <Typography variant={`headline${size.charAt(0).toUpperCase() + size.slice(1)}` as any} {...props} />
);

export const TitleText: React.FC<Omit<TypographyProps, 'variant'> & { size?: 'large' | 'medium' | 'small' }> = ({ 
  size = 'medium', 
  ...props 
}) => (
  <Typography variant={`title${size.charAt(0).toUpperCase() + size.slice(1)}` as any} {...props} />
);

export const BodyText: React.FC<Omit<TypographyProps, 'variant'> & { size?: 'large' | 'medium' | 'small' }> = ({ 
  size = 'medium', 
  ...props 
}) => (
  <Typography variant={`body${size.charAt(0).toUpperCase() + size.slice(1)}` as any} {...props} />
);

export const LabelText: React.FC<Omit<TypographyProps, 'variant'> & { size?: 'large' | 'medium' | 'small' }> = ({ 
  size = 'medium', 
  ...props 
}) => (
  <Typography variant={`label${size.charAt(0).toUpperCase() + size.slice(1)}` as any} {...props} />
);