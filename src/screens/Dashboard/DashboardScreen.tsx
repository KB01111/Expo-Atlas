import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../contexts/ThemeContext';
import { supabaseService } from '../../services/supabase';
import { DashboardMetrics } from '../../types';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Real-time system overview</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              {metrics.activeAgents}/{metrics.totalAgents}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Active Agents
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.success }]}>
              {metrics.completedTasks}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Completed Tasks
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.warning }]}>
              {metrics.averageSuccessRate.toFixed(1)}%
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Success Rate
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.secondary }]}>
              ${metrics.monthlyCost.toFixed(2)}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Monthly Cost
            </Text>
          </View>
        </View>

        <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            Task Activity (7 days)
          </Text>
          <LineChart
            data={taskData}
            width={width - 48}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            System Performance
          </Text>
          <BarChart
            data={performanceData}
            width={width - 48}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>

        <View style={[styles.statusContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
            System Status
          </Text>
          <View style={styles.statusList}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.statusText, { color: theme.colors.text }]}>
                API Services
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.statusText, { color: theme.colors.text }]}>
                Database
              </Text>
            </View>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={[styles.statusText, { color: theme.colors.text }]}>
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
    padding: 16,
    gap: 16,
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
  chartContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default DashboardScreen;