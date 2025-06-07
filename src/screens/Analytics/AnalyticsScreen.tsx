import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const AnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();

  const usageData = [
    {
      name: 'Content Generation',
      population: 35,
      color: theme.colors.primary,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Data Processing',
      population: 28,
      color: theme.colors.secondary,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Analytics',
      population: 22,
      color: theme.colors.success,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Other',
      population: 15,
      color: theme.colors.warning,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
  ];

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

      <ScrollView style={styles.content}>
        <View style={[styles.chartContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            Usage Distribution
          </Text>
          <PieChart
            data={usageData}
            width={width - 48}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              1,234
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Total Requests
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.success }]}>
              98.5%
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Uptime
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.warning }]}>
              123ms
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Avg Response
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.metricValue, { color: theme.colors.secondary }]}>
              $456
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