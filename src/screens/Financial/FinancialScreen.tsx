import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabaseService } from '../../services/supabase';
import { Execution } from '../../types';


const FinancialScreen: React.FC = () => {
  const { theme } = useTheme();
  const [executions, setExecutions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  const loadData = async () => {
    try {
      const [executionData, metricsData] = await Promise.all([
        supabaseService.getExecutions(),
        supabaseService.getDashboardMetrics()
      ]);
      setExecutions(executionData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading financial data:', error);
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

  const renderExecution = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.transactionCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionDescription, { color: theme.colors.text }]}>
            {item.agent?.name || `Execution ${item.id.slice(0, 8)}`}
          </Text>
          <Text style={[styles.transactionCategory, { color: theme.colors.textSecondary }]}>
            {item.status} • {new Date(item.started_at).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: theme.colors.primary }
        ]}>
          ${(item.cost || 0).toFixed(4)}
        </Text>
      </View>

      <View style={styles.transactionFooter}>
        <View style={styles.basInfo}>
          <Text style={[styles.basCategory, { color: theme.colors.secondary }]}>
            Tokens: {item.tokens_used || 0}
          </Text>
          <View style={styles.confidenceContainer}>
            <Text style={[styles.confidenceText, { color: theme.colors.textSecondary }]}>
              {item.user?.full_name || item.user?.email || 'Unknown user'}
            </Text>
            <View style={[
              styles.confidenceDot,
              { backgroundColor: item.status === 'completed' ? theme.colors.success : 
                item.status === 'failed' ? theme.colors.error : theme.colors.warning }
            ]} />
          </View>
        </View>
        {item.status === 'pending' && (
          <TouchableOpacity style={[styles.reviewButton, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.reviewButtonText}>View</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Financial</Text>
        <Text style={styles.headerSubtitle}>BAS automation & tracking</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="calendar" size={24} color={theme.colors.primary} />
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                This Month
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                ${(metrics?.monthlyCost || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="document-text" size={24} color={theme.colors.secondary} />
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                Pending Review
              </Text>
              <Text style={[styles.summaryCount, { color: theme.colors.warning }]}>
                {executions.filter(e => e.status === 'pending').length} items
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Executions
          </Text>
          <TouchableOpacity>
            <Ionicons name="filter" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={executions.slice(0, 20)}
          renderItem={renderExecution}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.transactionsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
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
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  transactionsList: {
    gap: 12,
  },
  transactionCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: '600',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  basInfo: {
    flex: 1,
  },
  basCategory: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceText: {
    fontSize: 12,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reviewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FinancialScreen;