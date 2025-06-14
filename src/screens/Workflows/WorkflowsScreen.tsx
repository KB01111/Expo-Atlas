import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, FlatList, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, Modal, AnimatedView } from '../../components/ui';
import WorkflowBuilder from '../../components/workflow/WorkflowBuilder';
import { supabaseService } from '../../services/supabase';
import { Workflow, WorkflowNode, WorkflowEdge, AppTheme } from '../../types';

const createStyles = (theme: AppTheme) => StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
  },
  quickActionContent: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 13,
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
  workflowsList: {
    gap: 16,
    paddingBottom: 100,
  },
  workflowHeader: {
    marginBottom: 12,
  },
  workflowInfo: {
    flex: 1,
  },
  workflowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  workflowName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  workflowDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  workflowDate: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  workflowStats: {
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

const WorkflowsScreen: React.FC = () => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);
  
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadWorkflows = async () => {
    try {
      const data = await supabaseService.getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkflows();
  };

  const openLangGraphOAP = () => {
    Linking.openURL('https://langgraph-oap.example.com');
  };

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setShowBuilder(true);
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleSaveWorkflow = async (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    try {
      const workflowData = {
        name: selectedWorkflow?.name || 'New Workflow',
        description: selectedWorkflow?.description || 'Created with workflow builder',
        nodes,
        edges
      };

      let result: any;
      if (selectedWorkflow) {
        result = await supabaseService.updateWorkflow(selectedWorkflow.id, workflowData);
        if (result) {
          setWorkflows(prev => prev.map(w => w.id === result.id ? result : w));
        }
      } else {
        result = await supabaseService.createWorkflow(workflowData);
        if (result) {
          setWorkflows(prev => [...prev, result]);
        }
      }

      setShowBuilder(false);
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  const renderWorkflow = ({ item, index }: { item: Workflow; index: number }) => (
    <AnimatedView animation="slideUp" delay={index * 100}>
      <Card variant="elevated" size="md" pressable onPress={() => handleEditWorkflow(item)}>
        <View style={styles.workflowHeader}>
          <View style={styles.workflowInfo}>
            <View style={styles.workflowTitleRow}>
              <Ionicons name="git-network" size={20} color={theme.colors.primary} />
              <Text style={styles.workflowName}>{item.name}</Text>
            </View>
            <Text style={styles.workflowDescription}>
              {item.description || 'No description'}
            </Text>
            <Text style={styles.workflowDate}>
              Created {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.workflowStats}>
          <View style={styles.statItem}>
            <Ionicons name="layers" size={16} color={theme.colors.info} />
            <Text style={[styles.statValue, { color: theme.colors.info }]}>
              {item.nodes?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Nodes</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="git-network" size={16} color={theme.colors.secondary} />
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
              {item.edges?.length || 0}
            </Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color={theme.colors.accent} />
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
              {new Date(item.updated_at).toLocaleDateString()}
            </Text>
            <Text style={styles.statLabel}>Updated</Text>
          </View>
        </View>
      </Card>
    </AnimatedView>
  );

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.center]}>
        <Text style={[sharedStyles.body, { textAlign: 'center', color: theme.colors.text }]}>
          Loading workflows...
        </Text>
      </View>
    );
  }

  return (
    <View style={sharedStyles.container}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={sharedStyles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={sharedStyles.headerTitle}>Workflows</Text>
        <Text style={sharedStyles.headerSubtitle}>Automation workflows</Text>
      </LinearGradient>

      <View style={sharedStyles.contentSpaced}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <AnimatedView animation="slideUp" delay={100}>
            <Card variant="elevated" size="md" pressable onPress={handleCreateWorkflow} style={styles.quickActionCard}>
              <View style={styles.quickActionContent}>
                <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
                <Text style={styles.quickActionTitle}>Create Workflow</Text>
                <Text style={styles.quickActionSubtitle}>Build with drag & drop</Text>
              </View>
            </Card>
          </AnimatedView>

          <AnimatedView animation="slideUp" delay={200}>
            <Card variant="elevated" size="md" pressable onPress={openLangGraphOAP} style={styles.quickActionCard}>
              <View style={styles.quickActionContent}>
                <Ionicons name="desktop" size={32} color={theme.colors.secondary} />
                <Text style={styles.quickActionTitle}>LangGraph OAP</Text>
                <Text style={styles.quickActionSubtitle}>Advanced editor</Text>
              </View>
            </Card>
          </AnimatedView>
        </View>

        {/* Workflows List */}
        <AnimatedView animation="slideUp" delay={300}>
          <Text style={styles.sectionTitle}>
            Your Workflows ({workflows.length})
          </Text>
        </AnimatedView>

        <FlatList
          data={workflows}
          renderItem={renderWorkflow}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.workflowsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <AnimatedView animation="fadeIn" delay={400}>
              <View style={styles.emptyState}>
                <Ionicons name="git-network" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyTitle}>No workflows yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first workflow to get started
                </Text>
              </View>
            </AnimatedView>
          }
        />
      </View>

      {/* Workflow Builder Modal */}
      <Modal
        visible={showBuilder}
        onClose={() => setShowBuilder(false)}
        title={selectedWorkflow ? 'Edit Workflow' : 'Create Workflow'}
        size="fullscreen"
      >
        <WorkflowBuilder
          onSave={handleSaveWorkflow}
          initialNodes={selectedWorkflow?.nodes || []}
          initialEdges={selectedWorkflow?.edges || []}
        />
      </Modal>
    </View>
  );
};

export default WorkflowsScreen;