import React from 'react';
import { View, ViewStyle, StyleProp, ScrollView, SafeAreaView, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isSmallScreen = screenWidth < 375;
const isIOS = Platform.OS === 'ios';

interface LayoutProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: boolean;
  paddingSize?: 'small' | 'normal' | 'large';
  safe?: boolean;
  scroll?: boolean;
  backgroundColor?: 'background' | 'surface' | 'transparent';
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  refreshControl?: React.ReactElement;
  bounces?: boolean;
  keyboardDismissMode?: 'none' | 'on-drag' | 'interactive';
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  style,
  padding = true,
  paddingSize = 'normal',
  safe = false,
  scroll = false,
  backgroundColor = 'background',
  edges = ['top', 'bottom'],
  refreshControl,
  bounces = isIOS,
  keyboardDismissMode = 'interactive',
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const getContainerStyle = (): StyleProp<ViewStyle> => {
    const baseStyle: ViewStyle = {
      flex: 1,
    };

    if (backgroundColor !== 'transparent') {
      baseStyle.backgroundColor = theme.colors[backgroundColor];
    }

    if (padding) {
      let paddingValue: number;
      switch (paddingSize) {
        case 'small':
          paddingValue = isTablet ? 20 : isSmallScreen ? 12 : 16;
          break;
        case 'large':
          paddingValue = isTablet ? 40 : 32;
          break;
        default:
          paddingValue = isTablet ? 32 : isSmallScreen ? 16 : 24;
      }
      baseStyle.paddingHorizontal = paddingValue;
    }

    // Add iOS-specific safe area handling
    if (safe && isIOS) {
      if (edges.includes('top')) {
        baseStyle.paddingTop = insets.top;
      }
      if (edges.includes('bottom')) {
        baseStyle.paddingBottom = insets.bottom;
      }
      if (edges.includes('left')) {
        baseStyle.paddingLeft = insets.left;
      }
      if (edges.includes('right')) {
        baseStyle.paddingRight = insets.right;
      }
    }

    return [baseStyle, style];
  };

  const Container = safe ? SafeAreaView : View;
  const ScrollContainer = scroll ? ScrollView : React.Fragment;

  if (scroll) {
    return (
      <Container style={getContainerStyle()}>
        <ScrollView
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingBottom: isIOS && safe ? insets.bottom : 0,
          }}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bounces={bounces}
          keyboardDismissMode={keyboardDismissMode}
          refreshControl={refreshControl}
          contentInsetAdjustmentBehavior={isIOS ? "automatic" : undefined}
        >
          {children}
        </ScrollView>
      </Container>
    );
  }

  return (
    <Container style={getContainerStyle()}>
      {children}
    </Container>
  );
};

// Row component for horizontal layouts
interface RowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: boolean;
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl';
}

export const Row: React.FC<RowProps> = ({
  children,
  style,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  gap = 'md',
}) => {
  const { theme } = useTheme();

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? 'wrap' : 'nowrap',
    gap: theme.spacing[gap],
  };

  return <View style={[rowStyle, style]}>{children}</View>;
};

// Column component for vertical layouts
interface ColumnProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'xxxxl';
}

export const Column: React.FC<ColumnProps> = ({
  children,
  style,
  align = 'stretch',
  justify = 'flex-start',
  gap = 'md',
}) => {
  const { theme } = useTheme();

  const columnStyle: ViewStyle = {
    flexDirection: 'column',
    alignItems: align,
    justifyContent: justify,
    gap: theme.spacing[gap],
  };

  return <View style={[columnStyle, style]}>{children}</View>;
};

// Center component for centering content
interface CenterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
}

export const Center: React.FC<CenterProps> = ({
  children,
  style,
  flex = false,
}) => {
  const centerStyle: ViewStyle = {
    alignItems: 'center',
    justifyContent: 'center',
    ...(flex && { flex: 1 }),
  };

  return <View style={[centerStyle, style]}>{children}</View>;
};

// Container component with max width constraint
interface ContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: boolean;
  center?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  style,
  maxWidth = false,
  center = false,
}) => {
  const { theme } = useTheme();

  const containerStyle: ViewStyle = {
    width: '100%',
    ...(maxWidth && { maxWidth: theme.layout.maxContentWidth }),
    ...(center && { alignSelf: 'center' }),
  };

  return <View style={[containerStyle, style]}>{children}</View>;
};

// Section component for content organization
interface SectionProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  title?: string;
  spacing?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  children,
  style,
  spacing = true,
}) => {
  const { theme } = useTheme();

  const sectionStyle: ViewStyle = {
    ...(spacing && { marginBottom: theme.layout.sectionSpacing }),
  };

  return <View style={[sectionStyle, style]}>{children}</View>;
};