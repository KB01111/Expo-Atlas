import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, AnimatedView } from '../../components/ui';
import { supabaseService } from '../../services/supabase';
import { AppTheme } from '../../types';

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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
  },
  chartCard: {
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: theme.colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

const AnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);
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

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.center]}>
        <Text style={[sharedStyles.body, { textAlign: 'center', color: theme.colors.text }]}>
          Loading analytics...
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
        <Text style={sharedStyles.headerTitle}>Analytics</Text>
        <Text style={sharedStyles.headerSubtitle}>Usage insights and metrics</Text>
      </LinearGradient>

      <View style={sharedStyles.contentSpaced}>
        {/* Metrics Overview */}
        <View style={styles.metricsGrid}>
          <AnimatedView animation="slideUp" delay={100}>
            <Card variant="elevated" size="md" style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="flash" size={24} color={theme.colors.primary} />
                <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                  {metrics?.totalTasks || 0}
                </Text>
              </View>
              <Text style={styles.metricLabel}>Total Executions</Text>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={200}>
            <Card variant="elevated" size="md" style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                <Text style={[styles.metricValue, { color: theme.colors.success }]}>
                  {(metrics?.averageSuccessRate || 0).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.metricLabel}>Success Rate</Text>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={300}>
            <Card variant="elevated" size="md" style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="trending-up" size={24} color={theme.colors.warning} />
                <Text style={[styles.metricValue, { color: theme.colors.warning }]}>
                  {analytics?.performance?.length || 0}
                </Text>
              </View>
              <Text style={styles.metricLabel}>Completed Tasks</Text>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={400}>
            <Card variant="elevated" size="md" style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="card" size={24} color={theme.colors.secondary} />
                <Text style={[styles.metricValue, { color: theme.colors.secondary }]}>
                  ${(metrics?.totalCost || 0).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.metricLabel}>Total Cost</Text>
            </Card>
          </AnimatedView>
        </View>

        {/* Usage Distribution Chart */}
        <AnimatedView animation="slideUp" delay={500}>
          <Card variant="elevated" size="lg" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="pie-chart" size={20} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>Usage Distribution</Text>
            </View>
            
            {usageData.length > 0 && usageData[0].name !== 'No data' ? (
              <PieChart
                data={usageData}
                width={width - 80}
                height={220}
                title="Usage Distribution"
                chartConfig={Platform.OS !== 'web' ? chartConfig : undefined}
                accessor={Platform.OS !== 'web' ? "population" : undefined}
                backgroundColor={Platform.OS !== 'web' ? "transparent" : undefined}
                paddingLeft={Platform.OS !== 'web' ? "15" : undefined}
                absolute={Platform.OS !== 'web' ? true : undefined}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="analytics" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyTitle}>No data available</Text>
                <Text style={styles.emptySubtitle}>
                  Start running tasks to see analytics
                </Text>
              </View>
            )}
          </Card>
        </AnimatedView>
      </View>
    </ScrollView>
  );
};


export default AnalyticsScreen;