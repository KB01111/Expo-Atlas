import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  ViewStyle,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles, getStatusColor } from '../../styles/shared';
import { Card, AnimatedView, Button, StatusBadge, Typography } from '../../components/ui';
import { MotiView } from '../../components/animations';

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
  const insets = useSafeAreaInsets();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  console.log('DashboardScreen: Component is rendering', { loading, metrics: !!metrics });

  const loadMetrics = async () => {
    try {
      console.log('DashboardScreen: Loading metrics...');
      const data = await supabaseService.getDashboardMetrics();
      console.log('DashboardScreen: Metrics loaded:', data);
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
        {/* Fallback UI for debugging */}
        <View style={{ marginTop: 20, padding: 20 }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, marginBottom: 10 }}>
            Debug Info:
          </Text>
          <Text style={{ color: theme.colors.text }}>Loading: {loading.toString()}</Text>
          <Text style={{ color: theme.colors.text }}>Has Metrics: {(!!metrics).toString()}</Text>
          <Text style={{ color: theme.colors.text }}>Platform: {Platform.OS}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        sharedStyles.container, 
        { 
          backgroundColor: theme.colors.background,
          paddingTop: Platform.OS === 'ios' ? insets.top : 0,
        }
      ]}
      contentContainerStyle={{
        paddingBottom: Platform.OS === 'ios' ? insets.bottom + 100 : 100,
      }}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
      bounces={Platform.OS === 'ios'}
    >
      {/* Modern Hero Section */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 800 }}
      >
        <LinearGradient
          colors={theme.gradients.hero}
          style={[
            sharedStyles.header,
            {
              borderBottomLeftRadius: theme.borderRadius.xxl,
              borderBottomRightRadius: theme.borderRadius.xxl,
              paddingBottom: theme.spacing.xxxl,
              marginBottom: -theme.spacing.xl,
            }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Typography variant="displaySmall" style={{ color: '#FFFFFF', marginBottom: theme.spacing.sm }}>
                Welcome back! 👋
              </Typography>
              <Typography variant="bodyLarge" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Here's what's happening with your AI agents today
              </Typography>
            </View>
            
            <MotiView
              from={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 300 }}
            >
              <StatusBadge 
                status="online" 
                variant="glass" 
                size="sm"
                customIcon="pulse"
                style={{ marginTop: theme.spacing.sm }}
              />
            </MotiView>
          </View>

          {/* Quick Action Button */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 400 }}
            style={{ marginTop: theme.spacing.xl }}
          >
            <Button
              title="Create New Agent"
              variant="glass"
              size="md"
              icon={<Ionicons name="add-circle" size={20} color="#FFFFFF" />}
              onPress={() => {/* Navigate to agent creation */}}
              style={{ alignSelf: 'flex-start' }}
            />
          </MotiView>
        </LinearGradient>
      </MotiView>

      <View style={[sharedStyles.contentSpaced, { paddingTop: theme.spacing.xxl }]}>
        {/* Modern Stats Cards */}
        <View style={styles.metricsGrid}>
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 100 }}
          >
            <Card 
              variant="elevated" 
              size="md" 
              style={[styles.metricCard, { backgroundColor: theme.colors.surface } as ViewStyle]}
              glowEffect={true}
              borderRadius="xxl"
              shadow="lg"
            >
              <View style={styles.metricHeader}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: `${theme.colors.primary}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: theme.spacing.md,
                }}>
                  <Ionicons name="people" size={24} color={theme.colors.primary} />
                </View>
                <Typography variant="displaySmall" style={{ color: theme.colors.primary, marginBottom: theme.spacing.xs }}>
                  {metrics.activeAgents}/{metrics.totalAgents}
                </Typography>
              </View>
              <Typography variant="labelLarge" style={{ color: theme.colors.textSecondary }}>
                Active Agents
              </Typography>
              <View style={{
                marginTop: theme.spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <StatusBadge 
                  status={metrics.activeAgents > 0 ? "online" : "offline"} 
                  variant="subtle" 
                  size="xs"
                />
                <Typography variant="bodySmall" style={{ color: theme.colors.textTertiary, marginLeft: theme.spacing.sm }}>
                  {((metrics.activeAgents / metrics.totalAgents) * 100).toFixed(0)}% active
                </Typography>
              </View>
            </Card>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 200 }}
          >
            <Card 
              variant="elevated" 
              size="md" 
              style={[styles.metricCard, { backgroundColor: theme.colors.surface } as ViewStyle]}
              glowEffect={true}
              borderRadius="xxl"
              shadow="lg"
            >
              <View style={styles.metricHeader}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: `${theme.colors.success}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: theme.spacing.md,
                }}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                </View>
                <Typography variant="displaySmall" style={{ color: theme.colors.success, marginBottom: theme.spacing.xs }}>
                  {metrics.completedTasks}
                </Typography>
              </View>
              <Typography variant="labelLarge" style={{ color: theme.colors.textSecondary }}>
                Completed Tasks
              </Typography>
              <View style={{
                marginTop: theme.spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <StatusBadge 
                  status="success" 
                  variant="subtle" 
                  size="xs"
                />
                <Typography variant="bodySmall" style={{ color: theme.colors.textTertiary, marginLeft: theme.spacing.sm }}>
                  +{Math.floor(Math.random() * 20) + 5} today
                </Typography>
              </View>
            </Card>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 300 }}
          >
            <Card 
              variant="elevated" 
              size="md" 
              style={[styles.metricCard, { backgroundColor: theme.colors.surface } as ViewStyle]}
              glowEffect={true}
              borderRadius="xxl"
              shadow="lg"
            >
              <View style={styles.metricHeader}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: `${theme.colors.accent}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: theme.spacing.md,
                }}>
                  <Ionicons name="trending-up" size={24} color={theme.colors.accent} />
                </View>
                <Typography variant="displaySmall" style={{ color: theme.colors.accent, marginBottom: theme.spacing.xs }}>
                  {metrics.averageSuccessRate.toFixed(1)}%
                </Typography>
              </View>
              <Typography variant="labelLarge" style={{ color: theme.colors.textSecondary }}>
                Success Rate
              </Typography>
              <View style={{
                marginTop: theme.spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <StatusBadge 
                  status={metrics.averageSuccessRate > 90 ? "success" : metrics.averageSuccessRate > 70 ? "warning" : "error"} 
                  variant="subtle" 
                  size="xs"
                />
                <Typography variant="bodySmall" style={{ color: theme.colors.textTertiary, marginLeft: theme.spacing.sm }}>
                  {metrics.averageSuccessRate > 90 ? 'Excellent' : metrics.averageSuccessRate > 70 ? 'Good' : 'Needs improvement'}
                </Typography>
              </View>
            </Card>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', delay: 400 }}
          >
            <Card 
              variant="elevated" 
              size="md" 
              style={[styles.metricCard, { backgroundColor: theme.colors.surface } as ViewStyle]}
              glowEffect={true}
              borderRadius="xxl"
              shadow="lg"
            >
              <View style={styles.metricHeader}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: `${theme.colors.secondary}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: theme.spacing.md,
                }}>
                  <Ionicons name="card" size={24} color={theme.colors.secondary} />
                </View>
                <Typography variant="displaySmall" style={{ color: theme.colors.secondary, marginBottom: theme.spacing.xs }}>
                  ${metrics.monthlyCost.toFixed(2)}
                </Typography>
              </View>
              <Typography variant="labelLarge" style={{ color: theme.colors.textSecondary }}>
                Monthly Cost
              </Typography>
              <View style={{
                marginTop: theme.spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <StatusBadge 
                  status={metrics.monthlyCost < 50 ? "success" : metrics.monthlyCost < 100 ? "warning" : "error"} 
                  variant="subtle" 
                  size="xs"
                />
                <Typography variant="bodySmall" style={{ color: theme.colors.textTertiary, marginLeft: theme.spacing.sm }}>
                  {metrics.monthlyCost < 50 ? 'Budget-friendly' : metrics.monthlyCost < 100 ? 'Moderate' : 'High usage'}
                </Typography>
              </View>
            </Card>
          </MotiView>
        </View>

        {/* Charts Section */}
        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 500 }}
        >
          <Card 
            variant="glass" 
            size="lg" 
            style={[styles.chartCard, { 
              backgroundColor: theme.colors.surfaceElevated,
              borderWidth: 1,
              borderColor: theme.colors.borderLight,
            } as ViewStyle]}
            glowEffect={true}
            borderRadius="xxl"
            shadow="lg"
          >
            <View style={[styles.chartHeader, { marginBottom: theme.spacing.lg }]}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: theme.borderRadius.md,
                backgroundColor: `${theme.colors.primary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="bar-chart" size={18} color={theme.colors.primary} />
              </View>
              <Typography variant="titleLarge" style={{ color: theme.colors.text, flex: 1 }}>
                Task Activity (7 days)
              </Typography>
              <StatusBadge status="active" variant="subtle" size="xs" />
            </View>
            <View style={{
              borderRadius: theme.borderRadius.lg,
              overflow: 'hidden',
              backgroundColor: theme.colors.background,
              padding: theme.spacing.sm,
            }}>
              <LineChart
                data={taskData}
                width={width - 80}
                height={200}
                title="Task Activity"
                chartConfig={Platform.OS !== 'web' ? chartConfig : undefined}
                bezier={Platform.OS !== 'web'}
                style={Platform.OS !== 'web' ? styles.chart : undefined}
              />
            </View>
          </Card>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 600 }}
        >
          <Card 
            variant="glass" 
            size="lg" 
            style={[styles.chartCard, { 
              backgroundColor: theme.colors.surfaceElevated,
              borderWidth: 1,
              borderColor: theme.colors.borderLight,
            } as ViewStyle]}
            glowEffect={true}
            borderRadius="xxl"
            shadow="lg"
          >
            <View style={[styles.chartHeader, { marginBottom: theme.spacing.lg }]}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: theme.borderRadius.md,
                backgroundColor: `${theme.colors.secondary}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="analytics" size={18} color={theme.colors.secondary} />
              </View>
              <Typography variant="titleLarge" style={{ color: theme.colors.text, flex: 1 }}>
                System Performance
              </Typography>
              <StatusBadge status="success" variant="subtle" size="xs" />
            </View>
            <View style={{
              borderRadius: theme.borderRadius.lg,
              overflow: 'hidden',
              backgroundColor: theme.colors.background,
              padding: theme.spacing.sm,
            }}>
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
            </View>
          </Card>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', delay: 700 }}
        >
          <Card 
            variant="elevated" 
            size="lg" 
            style={{ 
              backgroundColor: theme.colors.surfaceElevated,
              borderWidth: 1,
              borderColor: theme.colors.borderLight,
            } as ViewStyle}
            glowEffect={true}
            borderRadius="xxl"
            shadow="lg"
          >
            <View style={[styles.statusHeader, { marginBottom: theme.spacing.lg }]}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: theme.borderRadius.md,
                backgroundColor: `${theme.colors.success}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
              </View>
              <Typography variant="titleLarge" style={{ color: theme.colors.text, flex: 1 }}>
                System Status
              </Typography>
              <StatusBadge status="online" variant="glass" size="sm" pulsing={true} />
            </View>
            <View style={[styles.statusList, { gap: theme.spacing.md }]}>
              <View style={[styles.statusItem, {
                backgroundColor: theme.colors.backgroundSecondary,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.lg,
                borderWidth: 1,
                borderColor: theme.colors.borderLight,
              }]}>
                <StatusBadge status="success" variant="subtle" size="sm" />
                <Typography variant="bodyLarge" style={{ color: theme.colors.text, flex: 1 }}>
                  API Services
                </Typography>
                <Typography variant="labelMedium" style={{ color: theme.colors.success, fontWeight: '600' }}>
                  Healthy
                </Typography>
              </View>
              <View style={[styles.statusItem, {
                backgroundColor: theme.colors.backgroundSecondary,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.lg,
                borderWidth: 1,
                borderColor: theme.colors.borderLight,
              }]}>
                <StatusBadge status="success" variant="subtle" size="sm" />
                <Typography variant="bodyLarge" style={{ color: theme.colors.text, flex: 1 }}>
                  Database
                </Typography>
                <Typography variant="labelMedium" style={{ color: theme.colors.success, fontWeight: '600' }}>
                  Connected
                </Typography>
              </View>
              <View style={[styles.statusItem, {
                backgroundColor: theme.colors.backgroundSecondary,
                padding: theme.spacing.md,
                borderRadius: theme.borderRadius.lg,
                borderWidth: 1,
                borderColor: theme.colors.borderLight,
              }]}>
                <StatusBadge status="warning" variant="subtle" size="sm" />
                <Typography variant="bodyLarge" style={{ color: theme.colors.text, flex: 1 }}>
                  Background Jobs
                </Typography>
                <Typography variant="labelMedium" style={{ color: theme.colors.warning, fontWeight: '600' }}>
                  Slow
                </Typography>
              </View>
            </View>
          </Card>
        </MotiView>
      </View>
    </ScrollView>
  );
};

export default DashboardScreen;