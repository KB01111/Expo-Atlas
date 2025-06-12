import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface WebChartProps {
  data: any;
  width?: number;
  height?: number;
  title?: string;
}

const WebChart: React.FC<WebChartProps> = ({ title, width: chartWidth, height = 200 }) => {
  const { theme } = useTheme();

  return (
    <View style={{
      width: chartWidth || width - 48,
      height,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    }}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>
        {title || 'Chart'} (Web Preview)
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 8 }}>
        Charts will be rendered with react-native-chart-kit-chz in native apps
      </Text>
    </View>
  );
};

export default WebChart;