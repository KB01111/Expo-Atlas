import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { supabaseService } from '../../services/supabase';

// Conditional imports for web compatibility
let PieChart: any;
if (Platform.OS === 'web') {
  const WebChart = require('../../components/charts/WebChart').default;
  PieChart = WebChart;
} else {
  const ChartKit = require('react-native-chart-kit');
  PieChart = ChartKit.PieChart;
}

const { width } = Dimensions.get('window');

const AnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();
  const [analytics, setAnalytics] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [analyticsData, metricsData] = await Promise.all([
        supabaseService.getAnalytics(),
        supabaseService.getDashboardMetrics()
      ]);
      setAnalytics(analyticsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Process usage data from analytics
  const getUsageData = () => {
    if (!analytics || !analytics.usage) {
      return [
        {
          name: 'No data',
          population: 100,
          color: theme.colors.textSecondary,
          legendFontColor: theme.colors.text,
          legendFontSize: 12,
        }
      ];
    }

    // Group by status for pie chart
    const statusCounts = analytics.usage.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const colors = {
      completed: theme.colors.success,
      failed: theme.colors.error,
      pending: theme.colors.warning,
      running: theme.colors.primary,
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      population: count as number,
      color: colors[status as keyof typeof colors] || theme.colors.textSecondary,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    }));
  };

  const usageData = getUsageData();

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => theme.colors.text,
    labelColor: (opacity = 1) => theme.colors.text,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Usage insights and metrics</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            Usage Distribution
          </Text>
          <PieChart
            data={usageData}
            width={width - 48}
            height={220}
            title="Usage Distribution"
            chartConfig={Platform.OS !== 'web' ? chartConfig : undefined}
            accessor={Platform.OS !== 'web' ? "population" : undefined}
            backgroundColor={Platform.OS !== 'web' ? "transparent" : undefined}
            paddingLeft={Platform.OS !== 'web' ? "15" : undefined}
            absolute={Platform.OS !== 'web' ? true : undefined}
          />
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              {metrics?.totalTasks || 0}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Total Executions
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.success }]}>
              {(metrics?.averageSuccessRate || 0).toFixed(1)}%
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Success Rate
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.warning }]}>
              {analytics?.performance?.length || 0}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Completed Tasks
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.secondary }]}>
              ${(metrics?.totalCost || 0).toFixed(2)}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Total Cost
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#F1F5F9',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  chartContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default AnalyticsScreen;