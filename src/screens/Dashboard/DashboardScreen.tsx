import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles, getStatusColor } from '../../styles/shared';

// Conditional imports for web compatibility
let LineChart: any, BarChart: any;
if (Platform.OS === 'web') {
  const WebChart = require('../../components/charts/WebChart').default;
  LineChart = WebChart;
  BarChart = WebChart;
} else {
  const ChartKit = require('react-native-chart-kit');
  LineChart = ChartKit.LineChart;
  BarChart = ChartKit.BarChart;
}
import { supabaseService } from '../../services/supabase';
import { DashboardMetrics } from '../../types';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    try {
      const data = await supabaseService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadMetrics();
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.text,
    style: {
      borderRadius: 16,
    },
  };

  const taskData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43, 60],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const performanceData = {
    labels: ['Agents', 'Tasks', 'Success'],
    datasets: [
      {
        data: [metrics?.activeAgents || 0, metrics?.completedTasks || 0, metrics?.averageSuccessRate || 0],
      },
    ],
  };

  if (loading || !metrics) {
    return (
      <View style={[sharedStyles.container, sharedStyles.center]}>
        <Text style={[sharedStyles.body, { textAlign: 'center' }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={sharedStyles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient
        colors={theme.gradients.primary}
        style={sharedStyles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={sharedStyles.headerTitle}>Dashboard</Text>
        <Text style={sharedStyles.headerSubtitle}>Real-time system overview</Text>
      </LinearGradient>

      <View style={sharedStyles.content}>
        <View style={[sharedStyles.row, { flexWrap: 'wrap' }, sharedStyles.gapMD]}>
          <View style={sharedStyles.metricCard}>
            <Text style={[sharedStyles.metricValue, { color: theme.colors.primary }]}>
              {metrics.activeAgents}/{metrics.totalAgents}
            </Text>
            <Text style={sharedStyles.metricLabel}>
              Active Agents
            </Text>
          </View>

          <View style={sharedStyles.metricCard}>
            <Text style={[sharedStyles.metricValue, { color: theme.colors.success }]}>
              {metrics.completedTasks}
            </Text>
            <Text style={sharedStyles.metricLabel}>
              Completed Tasks
            </Text>
          </View>

          <View style={sharedStyles.metricCard}>
            <Text style={[sharedStyles.metricValue, { color: theme.colors.accent }]}>
              {metrics.averageSuccessRate.toFixed(1)}%
            </Text>
            <Text style={sharedStyles.metricLabel}>
              Success Rate
            </Text>
          </View>

          <View style={sharedStyles.metricCard}>
            <Text style={[sharedStyles.metricValue, { color: theme.colors.secondary }]}>
              ${metrics.monthlyCost.toFixed(2)}
            </Text>
            <Text style={sharedStyles.metricLabel}>
              Monthly Cost
            </Text>
          </View>
        </View>

        <View style={sharedStyles.cardLarge}>
          <Text style={sharedStyles.subtitle}>
            Task Activity (7 days)
          </Text>
          <LineChart
            data={taskData}
            width={width - 48}
            height={200}
            title="Task Activity"
            chartConfig={Platform.OS !== 'web' ? chartConfig : undefined}
            bezier={Platform.OS !== 'web'}
            style={Platform.OS !== 'web' ? styles.chart : undefined}
          />
        </View>

        <View style={sharedStyles.cardLarge}>
          <Text style={sharedStyles.subtitle}>
            System Performance
          </Text>
          <BarChart
            data={performanceData}
            width={width - 48}
            height={200}
            title="System Performance"
            yAxisLabel={Platform.OS !== 'web' ? "" : undefined}
            yAxisSuffix={Platform.OS !== 'web' ? "" : undefined}
            chartConfig={Platform.OS !== 'web' ? chartConfig : undefined}
            style={Platform.OS !== 'web' ? styles.chart : undefined}
          />
        </View>

        <View style={sharedStyles.card}>
          <Text style={sharedStyles.subtitle}>
            System Status
          </Text>
          <View style={sharedStyles.gapMD}>
            <View style={[sharedStyles.row, sharedStyles.gapMD]}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={sharedStyles.body}>
                API Services
              </Text>
            </View>
            <View style={[sharedStyles.row, sharedStyles.gapMD]}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={sharedStyles.body}>
                Database
              </Text>
            </View>
            <View style={[sharedStyles.row, sharedStyles.gapMD]}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={sharedStyles.body}>
                Background Jobs
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chart: {
    borderRadius: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default DashboardScreen;