import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal as RNModal,
  Dimensions,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, StatusBadge, AnimatedView, SearchBar, Button } from '../../components/ui';
import { OpenAIAgent, OpenAIAgentConversation } from '../../types/openai';
import { openaiAgentsComplete } from '../../services/openaiAgentsComplete';
import AgentCreationModal from '../../components/openai/AgentCreationModal';
import AgentChatInterface from '../../components/openai/AgentChatInterface';
import IOSAgentCreationModal from '../../components/openai/IOSAgentCreationModal';

const { width } = Dimensions.get('window');

interface AgentCardProps {
  agent: OpenAIAgent;
  onEdit: () => void;
  onDelete: () => void;
  onChat: () => void;
  onViewStats: () => void;
  theme: any;
  index: number;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onEdit,
  onDelete,
  onChat,
  onViewStats,
  theme,
  index
}) => {
  const styles = createStyles(theme);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <AnimatedView animation="slideUp" delay={index * 50}>
      <Card variant="elevated" size="md" style={styles.agentCard}>
        <View style={styles.agentHeader}>
          <View style={[styles.agentAvatar, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="hardware-chip" size={24} color={theme.colors.surface} />
          </View>
          
          <View style={styles.agentInfo}>
            <View style={styles.agentTitleRow}>
              <Text style={[styles.agentName, { color: theme.colors.text }]}>
                {agent.name}
              </Text>
              <StatusBadge status={agent.status} variant="subtle" />
            </View>
            
            <Text style={[styles.agentDescription, { color: theme.colors.textSecondary }]}>
              {agent.description || 'No description available'}
            </Text>
            
            <View style={styles.agentMeta}>
              <Text style={[styles.agentModel, { color: theme.colors.textSecondary }]}>
                {agent.model}
              </Text>
              <Text style={[styles.agentDate, { color: theme.colors.textSecondary }]}>
                Created {formatDate(agent.created_at)}
              </Text>
            </View>
          </View>

          <View style={styles.agentActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                onChat();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble" size={16} color={theme.colors.surface} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.agentStats, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.statItem} onPress={onViewStats}>
            <Ionicons name="flash" size={16} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {agent.executions}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Executions
            </Text>
          </TouchableOpacity>
          
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={[styles.statValue, { color: theme.colors.success }]}>
              {agent.successRate.toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Success
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="hammer" size={16} color={theme.colors.accent} />
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
              {agent.tools?.length || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Tools
            </Text>
          </View>

          <View style={styles.moreActions}>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  ActionSheetIOS.showActionSheetWithOptions(
                    {
                      options: ['Cancel', 'Edit Agent', 'View Statistics', 'Duplicate', 'Export', 'Delete'],
                      destructiveButtonIndex: 5,
                      cancelButtonIndex: 0,
                      title: agent.name,
                      message: 'Choose an action for this agent'
                    },
                    (buttonIndex) => {
                      switch (buttonIndex) {
                        case 1:
                          onEdit();
                          break;
                        case 2:
                          onViewStats();
                          break;
                        case 3:
                          // Duplicate agent
                          Haptics.selectionAsync();
                          break;
                        case 4:
                          // Export agent
                          Haptics.selectionAsync();
                          break;
                        case 5:
                          onDelete();
                          break;
                      }
                    }
                  );
                } else {
                  Alert.alert(
                    agent.name,
                    'Choose an action',
                    [
                      { text: 'Edit', onPress: onEdit },
                      { text: 'View Stats', onPress: onViewStats },
                      { text: 'Delete', onPress: onDelete, style: 'destructive' },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </AnimatedView>
  );
};

const EnhancedAgentsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);

  // State
  const [agents, setAgents] = useState<OpenAIAgent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<OpenAIAgent | null>(null);
  const [editingAgent, setEditingAgent] = useState<OpenAIAgent | null>(null);

  // Chat state
  const [currentConversation, setCurrentConversation] = useState<OpenAIAgentConversation | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentsList = await openaiAgentsComplete.listAgents();
      setAgents(agentsList);
    } catch (error) {
      console.error('Error loading agents:', error);
      Alert.alert('Error', 'Failed to load agents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAgents();
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setShowCreationModal(true);
  };

  const handleEditAgent = (agent: OpenAIAgent) => {
    setEditingAgent(agent);
    setShowCreationModal(true);
  };

  const handleDeleteAgent = async (agent: OpenAIAgent) => {
    Alert.alert(
      'Delete Agent',
      `Are you sure you want to delete "${agent.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await openaiAgentsComplete.deleteAgent(agent.id);
              if (success) {
                setAgents(prev => prev.filter(a => a.id !== agent.id));
                Alert.alert('Success', 'Agent deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete agent');
              }
            } catch (error) {
              console.error('Error deleting agent:', error);
              Alert.alert('Error', 'Failed to delete agent');
            }
          }
        }
      ]
    );
  };

  const handleChatWithAgent = async (agent: OpenAIAgent) => {
    setSelectedAgent(agent);
    
    try {
      // Create a new conversation
      const conversation = await openaiAgentsComplete.createConversation(
        agent.id,
        `Chat with ${agent.name}`
      );
      setCurrentConversation(conversation);
      setShowChatModal(true);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const handleViewStats = async (agent: OpenAIAgent) => {
    try {
      const stats = await openaiAgentsComplete.getAgentStats(agent.id);
      Alert.alert(
        `${agent.name} Statistics`,
        `Executions: ${stats.totalExecutions}\n` +
        `Success Rate: ${((stats.successfulExecutions / Math.max(stats.totalExecutions, 1)) * 100).toFixed(1)}%\n` +
        `Average Tokens: ${stats.averageTokensUsed.toFixed(0)}\n` +
        `Total Cost: $${stats.totalCost.toFixed(4)}\n` +
        `Avg Response Time: ${(stats.averageResponseTime / 1000).toFixed(1)}s\n` +
        `Last Executed: ${stats.lastExecuted ? new Date(stats.lastExecuted).toLocaleString() : 'Never'}`
      );
    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert('Error', 'Failed to load agent statistics');
    }
  };

  const handleSaveAgent = (agent: OpenAIAgent) => {
    if (editingAgent) {
      // Update existing agent
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    } else {
      // Add new agent
      setAgents(prev => [agent, ...prev]);
    }
    setShowCreationModal(false);
    setEditingAgent(null);
  };

  const handleConversationUpdate = (conversation: OpenAIAgentConversation) => {
    setCurrentConversation(conversation);
  };

  const handleOpenAgentBuilder = () => {
    navigation.navigate('AgentBuilder' as never);
  };

  const handleOpenMarketplace = () => {
    navigation.navigate('AgentMarketplace' as never);
  };

  const renderHeader = () => (
    <LinearGradient
      colors={theme.gradients.primary}
      style={sharedStyles.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Text style={sharedStyles.headerTitle}>AI Agents</Text>
          <Text style={sharedStyles.headerSubtitle}>
            {agents.length} agents • {agents.filter(a => a.status === 'active').length} active
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              handleOpenMarketplace();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="storefront" size={16} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>Marketplace</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              handleOpenAgentBuilder();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="construct" size={16} color="#FFFFFF" />
            <Text style={styles.headerButtonText}>Builder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="hardware-chip" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No AI agents found
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {searchQuery ? 'Try adjusting your search' : 'Create your first AI agent to get started'}
      </Text>
      {!searchQuery && (
        <Button
          title="Create First Agent"
          variant="primary"
          onPress={handleCreateAgent}
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  );

  const renderAgent = ({ item, index }: { item: OpenAIAgent; index: number }) => (
    <AgentCard
      agent={item}
      onEdit={() => handleEditAgent(item)}
      onDelete={() => handleDeleteAgent(item)}
      onChat={() => handleChatWithAgent(item)}
      onViewStats={() => handleViewStats(item)}
      theme={theme}
      index={index}
    />
  );

  const renderContent = () => {
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
      <View style={sharedStyles.contentSpaced}>
        <SearchBar
          placeholder="Search agents..."
          onSearch={setSearchQuery}
          value={searchQuery}
        />

        {filteredAgents.length > 0 ? (
          <FlatList
            data={filteredAgents}
            renderItem={renderAgent}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          renderEmpty()
        )}

        <TouchableOpacity 
          style={sharedStyles.fab} 
          onPress={() => {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            handleCreateAgent();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[sharedStyles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      {renderContent()}

      {/* Agent Creation Modal */}
      {Platform.OS === 'ios' ? (
        <IOSAgentCreationModal
          visible={showCreationModal}
          onClose={() => {
            setShowCreationModal(false);
            setEditingAgent(null);
          }}
          onSave={handleSaveAgent}
          initialConfig={editingAgent ? {
            name: editingAgent.name,
            description: editingAgent.description,
            instructions: editingAgent.instructions,
            model: editingAgent.model,
            tools: editingAgent.tools,
            temperature: editingAgent.temperature,
            top_p: editingAgent.top_p,
            max_tokens: editingAgent.max_tokens,
            metadata: editingAgent.metadata
          } : undefined}
          isEditing={!!editingAgent}
        />
      ) : (
        <AgentCreationModal
          visible={showCreationModal}
          onClose={() => {
            setShowCreationModal(false);
            setEditingAgent(null);
          }}
          onSave={handleSaveAgent}
          initialConfig={editingAgent ? {
            name: editingAgent.name,
            description: editingAgent.description,
            instructions: editingAgent.instructions,
            model: editingAgent.model,
            tools: editingAgent.tools,
            temperature: editingAgent.temperature,
            top_p: editingAgent.top_p,
            max_tokens: editingAgent.max_tokens,
            metadata: editingAgent.metadata
          } : undefined}
          isEditing={!!editingAgent}
        />
      )}

      {/* Chat Modal */}
      <RNModal
        visible={showChatModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {selectedAgent && (
            <AgentChatInterface
              agent={selectedAgent}
              conversationId={currentConversation?.id}
              onConversationUpdate={handleConversationUpdate}
              onClose={() => {
                setShowChatModal(false);
                setSelectedAgent(null);
                setCurrentConversation(null);
              }}
            />
          )}
        </View>
      </RNModal>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    gap: 16,
    paddingBottom: 100,
  },
  agentCard: {
    marginBottom: 0,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  agentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  agentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  agentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentModel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agentDate: {
    fontSize: 12,
  },
  agentActions: {
    marginLeft: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
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
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  moreActions: {
    position: 'absolute',
    right: 0,
    top: -8,
  },
  moreButton: {
    padding: 8,
    borderRadius: 16,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: width * 0.8,
  },
});

export default EnhancedAgentsScreen;