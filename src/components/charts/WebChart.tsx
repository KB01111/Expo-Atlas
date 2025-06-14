import React from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface WebChartProps {
  data: any;
  width?: number;
  height?: number;
  title?: string;
  type?: 'line' | 'bar' | 'pie';
}

const WebChart: React.FC<WebChartProps> = ({ data, title, width: chartWidth, height = 200, type = 'line' }) => {
  const { theme } = useTheme();

  if (Platform.OS === 'web') {
    // Dynamic import for web-only recharts
    const Recharts = require('recharts');
    const { LineChart, BarChart, PieChart, Line, Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

    const chartData = Array.isArray(data) ? data : [
      { name: 'Jan', value: 400 },
      { name: 'Feb', value: 300 },
      { name: 'Mar', value: 600 },
      { name: 'Apr', value: 800 },
      { name: 'May', value: 500 }
    ];

    const ChartComponent = () => {
      switch (type) {
        case 'bar':
          return (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
              <XAxis dataKey="name" stroke={theme.colors.textSecondary} />
              <YAxis stroke={theme.colors.textSecondary} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }} 
              />
              <Bar dataKey="value" fill={theme.colors.primary} />
            </BarChart>
          );
        case 'pie':
          return (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill={theme.colors.primary}
                dataKey="value"
                label
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }} 
              />
            </PieChart>
          );
        default: // line
          return (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
              <XAxis dataKey="name" stroke={theme.colors.textSecondary} />
              <YAxis stroke={theme.colors.textSecondary} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }} 
              />
              <Line type="monotone" dataKey="value" stroke={theme.colors.primary} strokeWidth={2} />
            </LineChart>
          );
      }
    };

    return (
      <View style={{
        width: chartWidth || width - 48,
        height,
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        padding: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent />
        </ResponsiveContainer>
      </View>
    );
  }

  // Fallback for non-web platforms - should not be used since we have platform-specific imports
  return null;
};

export default WebChart;