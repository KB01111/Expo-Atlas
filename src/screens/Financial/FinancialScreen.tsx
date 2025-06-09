import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, Button, AnimatedView } from '../../components/ui';
import { supabaseService } from '../../services/supabase';
import { Execution, AppTheme } from '../../types';

const createStyles = (theme: AppTheme) => StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
  },
  summaryContent: {
    alignItems: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  executionsList: {
    gap: 16,
    paddingBottom: 100,
  },
  executionHeader: {
    marginBottom: 12,
  },
  executionInfo: {
    flex: 1,
  },
  executionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  executionName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  executionCost: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  executionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  executionDate: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  executionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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

const FinancialScreen: React.FC = () => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);
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

  const handleStopExecution = async (executionId: string) => {
    try {
      const result = await supabaseService.stopExecution(executionId);
      if (result) {
        setExecutions(prev => 
          prev.map(exec => 
            exec.id === executionId 
              ? { ...exec, status: 'failed', error: 'Stopped by user' }
              : exec
          )
        );
      }
    } catch (error) {
      console.error('Error stopping execution:', error);
    }
  };

  const handleViewExecution = (executionId: string) => {
    console.log('View execution:', executionId);
    // Navigate to execution details
  };

  const handleRetryExecution = async (executionId: string) => {
    try {
      const originalExecution = executions.find(e => e.id === executionId);
      if (!originalExecution) return;

      const newExecution = await supabaseService.createExecution({
        agent_id: originalExecution.agent_id,
        user_id: originalExecution.user_id,
        input: originalExecution.input,
        status: 'pending'
      });

      if (newExecution) {
        setExecutions(prev => [newExecution, ...prev]);
      }
    } catch (error) {
      console.error('Error retrying execution:', error);
    }
  };

  const renderExecution = ({ item, index }: { item: any; index: number }) => (
    <AnimatedView animation="slideUp" delay={index * 50}>
      <Card variant="elevated" size="md" pressable onPress={() => handleViewExecution(item.id)}>
        <View style={styles.executionHeader}>
          <View style={styles.executionInfo}>
            <View style={styles.executionTitleRow}>
              <Ionicons name="flash" size={20} color={theme.colors.primary} />
              <Text style={styles.executionName}>
                {item.agent?.name || `Execution ${item.id.slice(0, 8)}`}
              </Text>
              <Text style={styles.executionCost}>
                ${(item.cost || 0).toFixed(4)}
              </Text>
            </View>
            <Text style={styles.executionDescription}>
              User: {item.user?.full_name || item.user?.email || 'Unknown user'}
            </Text>
            <Text style={styles.executionDate}>
              {new Date(item.started_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.executionStats}>
          <View style={styles.statItem}>
            <Ionicons name="layers" size={16} color={theme.colors.info} />
            <Text style={[styles.statValue, { color: theme.colors.info }]}>
              {item.tokens_used || 0}
            </Text>
            <Text style={styles.statLabel}>Tokens</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons 
              name={item.status === 'completed' ? 'checkmark-circle' : 
                   item.status === 'failed' ? 'close-circle' : 'time'} 
              size={16} 
              color={item.status === 'completed' ? theme.colors.success : 
                     item.status === 'failed' ? theme.colors.error : theme.colors.warning} 
            />
            <Text style={[
              styles.statValue, 
              { color: item.status === 'completed' ? theme.colors.success : 
                       item.status === 'failed' ? theme.colors.error : theme.colors.warning }
            ]}>
              {item.status}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
          
          <View style={styles.statItem}>
            {item.status === 'running' ? (
              <Button 
                variant="minimal" 
                size="xs" 
                onPress={() => handleStopExecution(item.id)}
              >
                Stop
              </Button>
            ) : item.status === 'failed' ? (
              <Button 
                variant="minimal" 
                size="xs" 
                onPress={() => handleRetryExecution(item.id)}
              >
                Retry
              </Button>
            ) : (
              <Button 
                variant="minimal" 
                size="xs" 
                onPress={() => handleViewExecution(item.id)}
              >
                View
              </Button>
            )}
          </View>
        </View>
      </Card>
    </AnimatedView>
  );

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.center]}>
        <Text style={[sharedStyles.body, { textAlign: 'center', color: theme.colors.text }]}>
          Loading financial data...
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
        <Text style={sharedStyles.headerTitle}>Financial</Text>
        <Text style={sharedStyles.headerSubtitle}>BAS automation & tracking</Text>
      </LinearGradient>

      <View style={sharedStyles.contentSpaced}>
        {/* Financial Summary */}
        <View style={styles.summaryGrid}>
          <AnimatedView animation="slideUp" delay={100}>
            <Card variant="elevated" size="md" style={styles.summaryCard}>
              <View style={styles.summaryContent}>
                <Ionicons name="card" size={24} color={theme.colors.success} />
                <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
                  ${(metrics?.monthlyCost || 0).toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>This Month</Text>
              </View>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={200}>
            <Card variant="elevated" size="md" style={styles.summaryCard}>
              <View style={styles.summaryContent}>
                <Ionicons name="document-text" size={24} color={theme.colors.warning} />
                <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>
                  {executions.filter(e => e.status === 'pending').length}
                </Text>
                <Text style={styles.summaryLabel}>Pending Review</Text>
              </View>
            </Card>
          </AnimatedView>
        </View>

        {/* Recent Executions */}
        <AnimatedView animation="slideUp" delay={300}>
          <Text style={styles.sectionTitle}>
            Recent Executions ({executions.length})
          </Text>
        </AnimatedView>

        {executions.length > 0 ? (
          <FlatList
            data={executions.slice(0, 20)}
            renderItem={renderExecution}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.executionsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <AnimatedView animation="fadeIn" delay={400}>
            <View style={styles.emptyState}>
              <Ionicons name="card" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No executions yet</Text>
              <Text style={styles.emptySubtitle}>
                Start running agents to see financial data
              </Text>
            </View>
          </AnimatedView>
        )}
      </View>
    </ScrollView>
  );
};


export default FinancialScreen;