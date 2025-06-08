import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, FlatList, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, Modal } from '../../components/ui';
import WorkflowBuilder from '../../components/workflow/WorkflowBuilder';
import { supabaseService } from '../../services/supabase';
import { Workflow, WorkflowNode, WorkflowEdge } from '../../types';

const WorkflowsScreen: React.FC = () => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  
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

      let result;
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

  const renderWorkflow = ({ item }: { item: Workflow }) => (
    <Card variant="default" onPress={() => handleEditWorkflow(item)}>
      <View style={styles.workflowHeader}>
        <View style={styles.workflowInfo}>
          <Text style={[sharedStyles.subtitle]}>
            {item.name}
          </Text>
          <Text style={[sharedStyles.body, { opacity: 0.7 }]}>
            {item.description || 'No description'}
          </Text>
          <Text style={[sharedStyles.caption]}>
            Created: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.workflowStats}>
          <Text style={[sharedStyles.caption]}>
            {item.nodes?.length || 0} nodes
          </Text>
          <Text style={[sharedStyles.caption]}>
            {item.edges?.length || 0} connections
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Workflows</Text>
        <Text style={styles.headerSubtitle}>Automation workflows</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Card variant="outline" onPress={handleCreateWorkflow}>
            <View style={styles.quickActionContent}>
              <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
              <Text style={[sharedStyles.subtitle, { textAlign: 'center' }]}>
                Create Workflow
              </Text>
              <Text style={[sharedStyles.caption, { textAlign: 'center' }]}>
                Build with drag & drop
              </Text>
            </View>
          </Card>

          <Card variant="outline" onPress={openLangGraphOAP}>
            <View style={styles.quickActionContent}>
              <Ionicons name="desktop" size={32} color={theme.colors.secondary} />
              <Text style={[sharedStyles.subtitle, { textAlign: 'center' }]}>
                LangGraph OAP
              </Text>
              <Text style={[sharedStyles.caption, { textAlign: 'center' }]}>
                Advanced editor
              </Text>
            </View>
          </Card>
        </View>

        {/* Workflows List */}
        <Text style={[sharedStyles.title, { marginBottom: 16 }]}>
          Your Workflows ({workflows.length})
        </Text>

        <FlatList
          data={workflows}
          renderItem={renderWorkflow}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.workflowsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[sharedStyles.center, { paddingVertical: 40 }]}>
              <Ionicons name="git-network" size={48} color={theme.colors.textSecondary} />
              <Text style={[sharedStyles.body, { marginTop: 16, textAlign: 'center' }]}>
                No workflows yet
              </Text>
              <Text style={[sharedStyles.caption, { textAlign: 'center' }]}>
                Create your first workflow to get started
              </Text>
            </View>
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
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionContent: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  workflowsList: {
    gap: 12,
    paddingBottom: 20,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workflowInfo: {
    flex: 1,
    gap: 4,
  },
  workflowStats: {
    alignItems: 'flex-end',
    gap: 2,
  },
});

export default WorkflowsScreen;