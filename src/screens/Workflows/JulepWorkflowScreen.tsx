import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, SearchBar, StatusBadge, AnimatedView, Modal } from '../../components/ui';
import { MotiView } from '../../components/animations';
import { createSharedStyles } from '../../styles/shared';
import { julepService } from '../../services/julepService';
import { JulepWorkflow, JulepExecution, OpenResponsesConfig } from '../../types/agents';
import { AppTheme } from '../../types';

const JulepWorkflowScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const sharedStyles = createSharedStyles(theme);

  // State management
  const [workflows, setWorkflows] = useState<JulepWorkflow[]>([]);
  const [executions, setExecutions] = useState<Record<string, JulepExecution[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<JulepWorkflow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<OpenResponsesConfig | null>(null);

  // Workflow creation state
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [newWorkflowYaml, setNewWorkflowYaml] = useState(DEFAULT_WORKFLOW_YAML);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadConfig();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const workflowsData = await julepService.getWorkflows();
      setWorkflows(workflowsData);
      
      // Load executions for each workflow
      const executionsData: Record<string, JulepExecution[]> = {};
      for (const workflow of workflowsData) {
        try {
          const workflowExecutions = await julepService.getWorkflowExecutions(workflow.id);
          executionsData[workflow.id] = workflowExecutions;
        } catch (error) {
          console.warn(`Failed to load executions for workflow ${workflow.id}:`, error);
          executionsData[workflow.id] = [];
        }
      }
      setExecutions(executionsData);
    } catch (error) {
      console.error('Error loading workflows:', error);
      Alert.alert('Error', 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const julepConfig = julepService.getConfig();
      setConfig(julepConfig);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWorkflows();
    setRefreshing(false);
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      Alert.alert('Error', 'Workflow name is required');
      return;
    }

    try {
      setCreating(true);
      const workflow = await julepService.createWorkflow(
        newWorkflowName,
        newWorkflowDescription,
        newWorkflowYaml
      );
      
      setWorkflows(prev => [workflow, ...prev]);
      setShowCreateModal(false);
      resetCreateForm();
      
      Alert.alert('Success', 'Workflow created successfully');
    } catch (error) {
      console.error('Error creating workflow:', error);
      Alert.alert('Error', 'Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  const handleExecuteWorkflow = async (workflow: JulepWorkflow) => {
    try {
      const execution = await julepService.executeWorkflow(workflow.id, {
        input: 'Hello, execute this workflow'
      });
      
      // Update executions
      setExecutions(prev => ({
        ...prev,
        [workflow.id]: [execution, ...(prev[workflow.id] || [])]
      }));
      
      Alert.alert('Success', 'Workflow executed successfully');
    } catch (error) {
      console.error('Error executing workflow:', error);
      Alert.alert('Error', 'Failed to execute workflow');
    }
  };

  const handleTestConnection = async () => {
    try {
      const isConnected = await julepService.testConnection();
      Alert.alert(
        isConnected ? 'Connection Successful' : 'Connection Failed',
        isConnected 
          ? 'Successfully connected to Julep Open Responses API'
          : 'Failed to connect to Julep Open Responses API'
      );
    } catch (error) {
      Alert.alert('Connection Failed', 'Failed to test connection');
    }
  };

  const resetCreateForm = () => {
    setNewWorkflowName('');
    setNewWorkflowDescription('');
    setNewWorkflowYaml(DEFAULT_WORKFLOW_YAML);
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getWorkflowStatusColor = (status: JulepWorkflow['status']) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'draft': return theme.colors.warning;
      case 'paused': return theme.colors.textSecondary;
      case 'archived': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getExecutionStatusColor = (status: JulepExecution['status']) => {
    switch (status) {
      case 'completed': return theme.colors.success;
      case 'running': return theme.colors.primary;
      case 'failed': return theme.colors.error;
      case 'pending': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const renderWorkflowCard = (workflow: JulepWorkflow, index: number) => {
    const workflowExecutions = executions[workflow.id] || [];
    const lastExecution = workflowExecutions[0];
    const successRate = workflowExecutions.length > 0 
      ? (workflowExecutions.filter(e => e.status === 'completed').length / workflowExecutions.length) * 100
      : 0;

    return (
      <MotiView
        key={workflow.id}
        preset="slideUp"
        delay={index * 100}
        style={styles.workflowCard}
      >
        <TouchableOpacity
          style={styles.workflowCardContent}
          onPress={() => setSelectedWorkflow(workflow)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[
              theme.colors.secondary + '15',
              theme.colors.primary + '10'
            ]}
            style={styles.workflowCardGradient}
          />
          
          {/* Header */}
          <View style={styles.workflowHeader}>
            <View style={styles.workflowInfo}>
              <View style={styles.workflowIcon}>
                <Ionicons 
                  name="git-network" 
                  size={24} 
                  color={theme.colors.secondary} 
                />
              </View>
              <View style={styles.workflowDetails}>
                <Text style={styles.workflowName} numberOfLines={1}>
                  {workflow.name}
                </Text>
                <Text style={styles.workflowDescription} numberOfLines={2}>
                  {workflow.description || 'No description'}
                </Text>
              </View>
            </View>
            <StatusBadge 
              status={workflow.status} 
            />
          </View>

          {/* Metrics */}
          <View style={styles.workflowMetrics}>
            <View style={styles.metricItem}>
              <Ionicons 
                name="play-circle" 
                size={16} 
                color={theme.colors.primary} 
              />
              <Text style={styles.metricValue}>
                {workflow.execution_count}
              </Text>
              <Text style={styles.metricLabel}>Executions</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color={theme.colors.success} 
              />
              <Text style={styles.metricValue}>
                {Math.round(successRate)}%
              </Text>
              <Text style={styles.metricLabel}>Success</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons 
                name="time" 
                size={16} 
                color={theme.colors.warning} 
              />
              <Text style={styles.metricValue}>
                {lastExecution ? formatDate(lastExecution.started_at) : 'Never'}
              </Text>
              <Text style={styles.metricLabel}>Last Run</Text>
            </View>
          </View>

          {/* Last Execution */}
          {lastExecution && (
            <View style={styles.lastExecution}>
              <View style={styles.executionInfo}>
                <View style={[
                  styles.executionStatus,
                  { backgroundColor: getExecutionStatusColor(lastExecution.status) }
                ]} />
                <Text style={styles.executionText}>
                  Latest: {lastExecution.status}
                </Text>
              </View>
              {lastExecution.status === 'completed' && (
                <Text style={styles.executionTime}>
                  {Math.round(lastExecution.total_cost * 100) / 100}¢
                </Text>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.workflowActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={() => handleExecuteWorkflow(workflow)}
            >
              <Ionicons 
                name="play" 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={styles.actionButtonTextPrimary}>Execute</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setSelectedWorkflow(workflow)}
            >
              <Ionicons 
                name="settings" 
                size={16} 
                color={theme.colors.text} 
              />
              <Text style={styles.actionButtonText}>Configure</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  const renderEmptyState = () => (
    <AnimatedView style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="git-network-outline" size={64} color={theme.colors.textSecondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No Workflows Yet</Text>
      <Text style={styles.emptyStateDescription}>
        Create your first Julep workflow to start building AI-powered automations
      </Text>
      <Button
        title="Create Workflow"
        onPress={() => setShowCreateModal(true)}
        variant="gradient"
        style={styles.emptyStateButton}
        icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
      />
    </AnimatedView>
  );

  const renderConfigSection = () => (
    <View style={styles.configSection}>
      <Text style={styles.configTitle}>Open Responses API Configuration</Text>
      {config ? (
        <View style={styles.configInfo}>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Base URL:</Text>
            <Text style={styles.configValue}>{config.base_url}</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Default Model:</Text>
            <Text style={styles.configValue}>{config.default_model}</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Available Models:</Text>
            <Text style={styles.configValue}>{config.available_models.length} models</Text>
          </View>
          <Button
            title="Test Connection"
            onPress={handleTestConnection}
            variant="outline"
            size="sm"
            style={styles.testButton}
          />
        </View>
      ) : (
        <Text style={styles.configError}>Configuration not loaded</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.secondary, theme.colors.primary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Julep Workflows</Text>
            <Text style={styles.headerSubtitle}>
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} • 
              {julepService.isServiceConfigured() ? ' Connected' : ' Disconnected'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => setShowConfigModal(true)}
            >
              <Ionicons name="settings" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerAction}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onSearch={setSearchQuery}
          placeholder="Search workflows..."
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading workflows...</Text>
          </View>
        ) : filteredWorkflows.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.workflowsList}>
            {filteredWorkflows.map(renderWorkflowCard)}
          </View>
        )}
      </ScrollView>

      {/* Create Workflow Modal */}
      <Modal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Workflow"
        size="large"
      >
        <ScrollView style={styles.createModalContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Workflow Name</Text>
            <TextInput
              style={styles.textInput}
              value={newWorkflowName}
              onChangeText={setNewWorkflowName}
              placeholder="Enter workflow name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={newWorkflowDescription}
              onChangeText={setNewWorkflowDescription}
              placeholder="Describe what this workflow does"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>YAML Definition</Text>
            <TextInput
              style={[styles.textInput, styles.yamlInput]}
              value={newWorkflowYaml}
              onChangeText={setNewWorkflowYaml}
              placeholder="Enter YAML workflow definition"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={15}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <Button
            title="Cancel"
            onPress={() => setShowCreateModal(false)}
            variant="outline"
            style={styles.modalActionButton}
          />
          <Button
            title={creating ? 'Creating...' : 'Create Workflow'}
            onPress={handleCreateWorkflow}
            variant="gradient"
            disabled={creating || !newWorkflowName.trim()}
            loading={creating}
            style={styles.modalActionButton}
          />
        </View>
      </Modal>

      {/* Config Modal */}
      <Modal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Julep Configuration"
        size="medium"
      >
        <View style={styles.configModalContent}>
          {renderConfigSection()}
        </View>
      </Modal>
    </View>
  );
};

const DEFAULT_WORKFLOW_YAML = `name: Simple AI Workflow
description: A basic workflow that processes input through an AI agent

main:
  - tool: llm
    model: gpt-4o-mini
    prompt: |
      You are a helpful AI assistant. Please respond to the following input:
      {{input}}
    temperature: 0.7
    max_tokens: 1000`;

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    return 'Recent';
  }
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    padding: 20,
  },
  searchBar: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  workflowsList: {
    gap: 16,
    paddingBottom: 100,
  },
  workflowCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  workflowCardContent: {
    position: 'relative',
  },
  workflowCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  workflowInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  workflowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workflowDetails: {
    flex: 1,
  },
  workflowName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  workflowDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  workflowMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  metricLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  lastExecution: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  executionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  executionStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  executionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  executionTime: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
  },
  workflowActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    paddingHorizontal: 32,
  },
  createModalContent: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  yamlInput: {
    height: 300,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  modalActionButton: {
    flex: 1,
  },
  configModalContent: {
    padding: 20,
  },
  configSection: {
    gap: 16,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  configInfo: {
    gap: 12,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  configLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  configValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  configError: {
    fontSize: 14,
    color: theme.colors.error,
    textAlign: 'center',
    padding: 20,
  },
  testButton: {
    marginTop: 12,
  },
});

export default JulepWorkflowScreen;