import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { supabaseService } from '../../services/supabase';
import openAIAgentsService from '../../services/openaiAgentsSimple';
import { Agent, AppTheme } from '../../types';
import { OpenAIAgent, OpenAIAgentExecution } from '../../types/openai';
import { Card, StatusBadge, AnimatedView, SearchBar, Button } from '../../components/ui';
import { createSharedStyles } from '../../styles/shared';
import AgentModal from '../../components/modals/AgentModal';
import OpenAIAgentModal from '../../components/openai/OpenAIAgentModal';
import OpenAIExecutionModal from '../../components/openai/OpenAIExecutionModal';
import OpenAIConfigModal from '../../components/openai/OpenAIConfigModal';

const createStyles = (theme: AppTheme) => StyleSheet.create({
  listContainer: {
    gap: 16,
    paddingBottom: 100,
  },
  agentCard: {
    marginBottom: 0,
  },
  agentHeader: {
    marginBottom: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  agentDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  agentProvider: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agentStats: {
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
    flex: 1,
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

const AgentsScreen: React.FC = () => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [openAIAgents, setOpenAIAgents] = useState<OpenAIAgent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOpenAIModal, setShowOpenAIModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedOpenAIAgent, setSelectedOpenAIAgent] = useState<OpenAIAgent | null>(null);
  const [agentType, setAgentType] = useState<'standard' | 'openai'>('standard');

  const loadAgents = async () => {
    try {
      const [standardAgents, openAIAgentsList] = await Promise.all([
        supabaseService.getAgents(),
        openAIAgentsService.listAgents()
      ]);
      setAgents(standardAgents);
      setOpenAIAgents(openAIAgentsList);
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAgents();
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredOpenAIAgents = openAIAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const allFilteredAgents = agentType === 'standard' ? filteredAgents : filteredOpenAIAgents;

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setShowModal(true);
  };

  const handleCreateOpenAIAgent = () => {
    if (!openAIAgentsService.isConfigured()) {
      setShowConfigModal(true);
      return;
    }
    setSelectedOpenAIAgent(null);
    setShowOpenAIModal(true);
  };

  const handleEditOpenAIAgent = (agent: OpenAIAgent) => {
    setSelectedOpenAIAgent(agent);
    setShowOpenAIModal(true);
  };

  const handleExecuteOpenAIAgent = (agent: OpenAIAgent) => {
    setSelectedOpenAIAgent(agent);
    setShowExecutionModal(true);
  };

  const handleSaveOpenAIAgent = async (agent: OpenAIAgent) => {
    try {
      if (selectedOpenAIAgent) {
        // Update existing agent
        const updatedAgent = await openAIAgentsService.updateAgent(agent.id, {
          name: agent.name,
          description: agent.description,
          model: agent.model,
          instructions: agent.instructions,
          tools: agent.tools,
          metadata: agent.metadata
        });
        setOpenAIAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
      } else {
        // Create new agent
        const newAgent = await openAIAgentsService.createAgent({
          name: agent.name,
          description: agent.description,
          model: agent.model,
          instructions: agent.instructions,
          tools: agent.tools,
          metadata: agent.metadata
        });
        setOpenAIAgents(prev => [...prev, newAgent]);
      }
    } catch (error) {
      console.error('Error saving OpenAI agent:', error);
      Alert.alert('Error', 'Failed to save OpenAI agent. Please try again.');
    }
  };

  const handleDeleteOpenAIAgent = async (agent: OpenAIAgent) => {
    Alert.alert(
      'Delete Agent',
      `Are you sure you want to delete "${agent.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await openAIAgentsService.deleteAgent(agent.id);
            if (success) {
              setOpenAIAgents(prev => prev.filter(a => a.id !== agent.id));
            }
          }
        }
      ]
    );
  };

  const handleExecutionComplete = (execution: OpenAIAgentExecution) => {
    // Update agent execution count
    setOpenAIAgents(prev => prev.map(agent => 
      agent.id === execution.agentId 
        ? { ...agent, executions: agent.executions + 1 }
        : agent
    ));
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowModal(true);
  };

  const handleDeleteAgent = async (agent: Agent) => {
    const success = await supabaseService.deleteAgent(agent.id);
    if (success) {
      setAgents(prev => prev.filter(a => a.id !== agent.id));
    }
  };

  const handleSaveAgent = (agent: Agent) => {
    if (selectedAgent) {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    } else {
      setAgents(prev => [...prev, agent]);
    }
  };

  const renderAgent = ({ item, index }: { item: Agent; index: number }) => (
    <AnimatedView animation="slideUp" delay={index * 50}>
      <Card 
        variant="elevated" 
        size="md" 
        pressable
        onPress={() => handleEditAgent(item)}
        style={styles.agentCard}
      >
        <View style={styles.agentHeader}>
          <View style={styles.agentInfo}>
            <View style={styles.agentTitleRow}>
              <Text style={styles.agentName}>{item.name}</Text>
              <StatusBadge status={item.status} variant="subtle" />
            </View>
            <Text style={styles.agentDescription}>
              {item.description || 'No description available'}
            </Text>
            <Text style={styles.agentProvider}>
              {item.provider} • {item.model}
            </Text>
          </View>
        </View>

        <View style={styles.agentStats}>
          <View style={styles.statItem}>
            <Ionicons name="list" size={16} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {item.tasks || 0}
            </Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {(item.successRate || 0).toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="time" size={16} color={theme.colors.info} />
            <Text style={[styles.statValue, { color: theme.colors.info }]}>
              {new Date(item.updated_at).toLocaleDateString()}
            </Text>
            <Text style={styles.statLabel}>Updated</Text>
          </View>
        </View>
      </Card>
    </AnimatedView>
  );

  const renderOpenAIAgent = ({ item, index }: { item: OpenAIAgent; index: number }) => (
    <AnimatedView animation="slideUp" delay={index * 50}>
      <Card 
        variant="elevated" 
        size="md" 
        pressable
        onPress={() => handleEditOpenAIAgent(item)}
        style={styles.agentCard}
      >
        <View style={styles.agentHeader}>
          <View style={styles.agentInfo}>
            <View style={styles.agentTitleRow}>
              <Ionicons name="hardware-chip" size={20} color="#00A67E" />
              <Text style={styles.agentName}>{item.name}</Text>
              <StatusBadge status={item.status} variant="subtle" />
            </View>
            <Text style={styles.agentDescription}>
              {item.description || 'No description available'}
            </Text>
            <Text style={styles.agentProvider}>
              OpenAI Agents • {item.model}
            </Text>
          </View>
        </View>

        <View style={styles.agentStats}>
          <View style={styles.statItem}>
            <Ionicons name="hammer" size={16} color={theme.colors.secondary} />
            <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
              {item.tools.length}
            </Text>
            <Text style={styles.statLabel}>Tools</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="flash" size={16} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {item.executions}
            </Text>
            <Text style={styles.statLabel}>Executions</Text>
          </View>

          <View style={styles.statItem}>
            <Button
              title="Execute"
              variant="minimal"
              size="xs"
              onPress={() => handleExecuteOpenAIAgent(item)}
            />
          </View>
        </View>
      </Card>
    </AnimatedView>
  );

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.center]}>
        <Text style={[sharedStyles.body, { textAlign: 'center', color: theme.colors.text }]}>
          Loading agents...
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
        <Text style={sharedStyles.headerTitle}>Agents</Text>
        <Text style={sharedStyles.headerSubtitle}>Manage your AI agents</Text>
      </LinearGradient>

      <View style={sharedStyles.contentSpaced}>
        {/* Agent Type Toggle */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <Button
            title={`Standard Agents (${agents.length})`}
            variant={agentType === 'standard' ? 'primary' : 'outline'}
            size="sm"
            onPress={() => setAgentType('standard')}
            style={{ flex: 1 }}
          />
          <Button
            title={`OpenAI Agents (${openAIAgents.length})`}
            variant={agentType === 'openai' ? 'primary' : 'outline'}
            size="sm"
            onPress={() => setAgentType('openai')}
            style={{ flex: 1 }}
          />
        </View>

        <SearchBar
          placeholder={`Search ${agentType} agents...`}
          onSearch={setSearchQuery}
          value={searchQuery}
        />

        {allFilteredAgents.length > 0 ? (
          <FlatList
            data={allFilteredAgents as (Agent | OpenAIAgent)[]}
            renderItem={({ item, index }) => 
              agentType === 'standard' 
                ? renderAgent({ item: item as Agent, index })
                : renderOpenAIAgent({ item: item as OpenAIAgent, index })
            }
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons 
              name={agentType === 'openai' ? 'hardware-chip' : 'desktop'} 
              size={64} 
              color={theme.colors.textSecondary} 
            />
            <Text style={styles.emptyTitle}>
              No {agentType} agents found
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search' 
                : `Create your first ${agentType} agent`
              }
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={sharedStyles.fab} 
          onPress={agentType === 'standard' ? handleCreateAgent : handleCreateOpenAIAgent}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Standard Agent Modal */}
      <AgentModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveAgent}
        agent={selectedAgent}
      />

      {/* OpenAI Agent Modal */}
      <OpenAIAgentModal
        visible={showOpenAIModal}
        onClose={() => setShowOpenAIModal(false)}
        onSave={handleSaveOpenAIAgent}
        agent={selectedOpenAIAgent}
        isEditing={!!selectedOpenAIAgent}
      />

      {/* OpenAI Execution Modal */}
      {selectedOpenAIAgent && (
        <OpenAIExecutionModal
          visible={showExecutionModal}
          onClose={() => setShowExecutionModal(false)}
          agent={selectedOpenAIAgent}
          onExecutionComplete={handleExecutionComplete}
        />
      )}

      {/* OpenAI Configuration Modal */}
      <OpenAIConfigModal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfigured={() => {
          setShowConfigModal(false);
          setShowOpenAIModal(true);
        }}
      />
    </View>
  );
};

export default AgentsScreen;