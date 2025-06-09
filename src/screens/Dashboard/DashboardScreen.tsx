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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles, getStatusColor } from '../../styles/shared';
import { Card, AnimatedView } from '../../components/ui';

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
import { DashboardMetrics, AppTheme } from '../../types';

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
  chart: {
    borderRadius: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: theme.colors.text,
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

const DashboardScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);
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
    const interval = setInterval(loadMetrics, 30000);
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
    color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
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
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
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
        <Text style={[sharedStyles.body, { textAlign: 'center', color: theme.colors.text }]}>
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

      <View style={sharedStyles.contentSpaced}>
        {/* Quick Stats Grid */}
        <View style={styles.metricsGrid}>
          <AnimatedView animation="slideUp" delay={100}>
            <Card variant="elevated" size="md" style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="people" size={24} color={theme.colors.primary} />
                <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                  {metrics.activeAgents}/{metrics.totalAgents}
                </Text>
              </View>
              <Text style={styles.metricLabel}>Active Agents</Text>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={200}>
            <Card variant="elevated" size="md" style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                <Text style={[styles.metricValue, { color: theme.colors.success }]}>
                  {metrics.completedTasks}
                </Text>
              </View>
              <Text style={styles.metricLabel}>Completed Tasks</Text>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={300}>
            <Card variant="elevated" size="md" style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="trending-up" size={24} color={theme.colors.accent} />
                <Text style={[styles.metricValue, { color: theme.colors.accent }]}>
                  {metrics.averageSuccessRate.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.metricLabel}>Success Rate</Text>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={400}>
            <Card variant="elevated" size="md" style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="card" size={24} color={theme.colors.secondary} />
                <Text style={[styles.metricValue, { color: theme.colors.secondary }]}>
                  ${metrics.monthlyCost.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.metricLabel}>Monthly Cost</Text>
            </Card>
          </AnimatedView>
        </View>

        {/* Charts Section */}
        <AnimatedView animation="slideUp" delay={500}>
          <Card variant="elevated" size="lg" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="bar-chart" size={20} color={theme.colors.primary} />
              <Text style={styles.chartTitle}>Task Activity (7 days)</Text>
            </View>
            <LineChart
              data={taskData}
              width={width - 80}
              height={200}
              title="Task Activity"
              chartConfig={Platform.OS !== 'web' ? chartConfig : undefined}
              bezier={Platform.OS !== 'web'}
              style={Platform.OS !== 'web' ? styles.chart : undefined}
            />
          </Card>
        </AnimatedView>

        <AnimatedView animation="slideUp" delay={600}>
          <Card variant="elevated" size="lg" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="analytics" size={20} color={theme.colors.secondary} />
              <Text style={styles.chartTitle}>System Performance</Text>
            </View>
            <BarChart
              data={performanceData}
              width={width - 80}
              height={200}
              title="System Performance"
              yAxisLabel={Platform.OS !== 'web' ? "" : undefined}
              yAxisSuffix={Platform.OS !== 'web' ? "" : undefined}
              chartConfig={Platform.OS !== 'web' ? chartConfig : undefined}
              style={Platform.OS !== 'web' ? styles.chart : undefined}
            />
          </Card>
        </AnimatedView>

        <AnimatedView animation="slideUp" delay={700}>
          <Card variant="elevated" size="lg">
            <View style={styles.statusHeader}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
              <Text style={styles.statusTitle}>System Status</Text>
            </View>
            <View style={styles.statusList}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.statusText}>API Services</Text>
                <Text style={[styles.statusBadge, { color: theme.colors.success }]}>Healthy</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
                <Text style={styles.statusText}>Database</Text>
                <Text style={[styles.statusBadge, { color: theme.colors.success }]}>Connected</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.colors.warning }]} />
                <Text style={styles.statusText}>Background Jobs</Text>
                <Text style={[styles.statusBadge, { color: theme.colors.warning }]}>Slow</Text>
              </View>
            </View>
          </Card>
        </AnimatedView>
      </View>
    </ScrollView>
  );
};

export default DashboardScreen;