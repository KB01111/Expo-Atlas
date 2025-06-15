import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl';
  horizontal?: boolean;
  vertical?: boolean;
  custom?: number;
  style?: ViewStyle;
}

export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  horizontal = false,
  vertical = false,
  custom,
  style,
}) => {
  const { theme } = useTheme();

  const getSpacerStyle = (): ViewStyle => {
    const spacing = custom || theme.spacing[size];

    if (horizontal && vertical) {
      return {
        width: spacing,
        height: spacing,
      };
    }

    if (horizontal) {
      return {
        width: spacing,
        height: 1,
      };
    }

    return {
      width: '100%',
      height: spacing,
    };
  };

  return <View style={[getSpacerStyle(), style]} />;
};

// Convenience components
export const HorizontalSpacer: React.FC<Omit<SpacerProps, 'horizontal'>> = (props) => (
  <Spacer {...props} horizontal />
);

export const VerticalSpacer: React.FC<Omit<SpacerProps, 'vertical'>> = (props) => (
  <Spacer {...props} vertical />
);

// Common spacing presets
export const TinySpace: React.FC<Omit<SpacerProps, 'size'>> = (props) => (
  <Spacer {...props} size="xs" />
);

export const SmallSpace: React.FC<Omit<SpacerProps, 'size'>> = (props) => (
  <Spacer {...props} size="sm" />
);

export const MediumSpace: React.FC<Omit<SpacerProps, 'size'>> = (props) => (
  <Spacer {...props} size="md" />
);

export const LargeSpace: React.FC<Omit<SpacerProps, 'size'>> = (props) => (
  <Spacer {...props} size="lg" />
);

export const ExtraLargeSpace: React.FC<Omit<SpacerProps, 'size'>> = (props) => (
  <Spacer {...props} size="xl" />
);

// Section spacer for content organization
export const SectionSpacer: React.FC<Omit<SpacerProps, 'custom'>> = (props) => {
  const { theme } = useTheme();
  return <Spacer {...props} custom={theme.layout.sectionSpacing} />;
};

// Item spacer for consistent item spacing
export const ItemSpacer: React.FC<Omit<SpacerProps, 'custom'>> = (props) => {
  const { theme } = useTheme();
  return <Spacer {...props} custom={theme.layout.itemSpacing} />;
};