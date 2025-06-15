import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { MotiView } from '../../components/animations';
import { useTheme } from '../../contexts/ThemeContext';
import { supabaseService } from '../../services/supabase';
import openAIAgentsService from '../../services/openaiAgentsSimple';
import { Agent, AppTheme } from '../../types';
import { OpenAIAgent, OpenAIAgentExecution } from '../../types/openai';
import { Card, StatusBadge, AnimatedView, SearchBar, Button, Layout, Row, Column, Input } from '../../components/ui';
import { createSharedStyles } from '../../styles/shared';
import AgentModal from '../../components/modals/AgentModal';
import OpenAIAgentModal from '../../components/openai/OpenAIAgentModal';
import OpenAIExecutionModal from '../../components/openai/OpenAIExecutionModal';
import OpenAIConfigModal from '../../components/openai/OpenAIConfigModal';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const numColumns = isTablet ? 2 : 1;

const createStyles = (theme: AppTheme) => StyleSheet.create({
  headerContainer: {
    backgroundColor: theme.colors.background,
    paddingBottom: theme.spacing.lg,
  },
  searchContainer: {
    marginBottom: theme.spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  listContainer: {
    gap: isTablet ? 20 : 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showActionSheetWithOptions } = useActionSheet();
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'lastRun'>('name');
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

  const handleOpenAgentBuilder = () => {
    navigation.navigate('AgentBuilder' as never);
  };

  const handleOpenMarketplace = () => {
    navigation.navigate('AgentMarketplace' as never);
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
            <TouchableOpacity onPress={() => handleExecuteOpenAIAgent(item)}>
              <Button title="Execute" variant="minimal" size="xs" onPress={() => {}} />
            </TouchableOpacity>
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

  const showFilterMenu = () => {
    const options = ['All Agents', 'Active Only', 'Inactive Only', 'Cancel'];
    const cancelButtonIndex = 3;
    
    showActionSheetWithOptions({
      options,
      cancelButtonIndex,
      title: 'Filter agents',
    }, (selectedIndex) => {
      switch (selectedIndex) {
        case 0:
          setSelectedFilter('all');
          break;
        case 1:
          setSelectedFilter('active');
          break;
        case 2:
          setSelectedFilter('inactive');
          break;
      }
    });
  };

  const showSortMenu = () => {
    const options = ['Sort by Name', 'Sort by Created Date', 'Sort by Last Run', 'Cancel'];
    const cancelButtonIndex = 3;
    
    showActionSheetWithOptions({
      options,
      cancelButtonIndex,
      title: 'Sort agents',
    }, (selectedIndex) => {
      switch (selectedIndex) {
        case 0:
          setSortBy('name');
          break;
        case 1:
          setSortBy('created');
          break;
        case 2:
          setSortBy('lastRun');
          break;
      }
    });
  };

  return (
    <Layout 
      safe={true} 
      edges={['top']} 
      backgroundColor="background"
      padding={false}
    >
      {/* Enhanced Header with iOS-style design */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
      >
        <LinearGradient
          colors={theme.gradients.primary}
          style={[
            styles.headerContainer,
            {
              paddingTop: insets.top + theme.spacing.lg,
              paddingHorizontal: theme.spacing.xl,
              borderBottomLeftRadius: theme.borderRadius.xxl,
              borderBottomRightRadius: theme.borderRadius.xxl,
            }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Row justify="space-between" align="flex-start" style={{ marginBottom: theme.spacing.lg }}>
            <Column align="flex-start" style={{ flex: 1 }}>
              <Text style={[sharedStyles.headerTitle, { fontSize: 28, fontWeight: '700' }]}>Agents</Text>
              <Text style={[sharedStyles.headerSubtitle, { fontSize: 16, opacity: 0.9 }]}>
                {allFilteredAgents.length} agents • Manage your AI workforce
              </Text>
            </Column>
            
            <Row gap="sm">
              <TouchableOpacity
                onPress={handleOpenMarketplace}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="storefront" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Store</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleOpenAgentBuilder}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Create</Text>
              </TouchableOpacity>
            </Row>
          </Row>
          
          {/* Enhanced Agent Type Toggle */}
          <Row gap="xs" style={{ marginBottom: theme.spacing.md }}>
            <TouchableOpacity
              onPress={() => setAgentType('standard')}
              style={[
                {
                  flex: 1,
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.borderRadius.lg,
                  borderWidth: 2,
                  borderColor: agentType === 'standard' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                  backgroundColor: agentType === 'standard' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                }
              ]}
              activeOpacity={0.8}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center',
              }}>
                Standard ({agents.length})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setAgentType('openai')}
              style={[
                {
                  flex: 1,
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.borderRadius.lg,
                  borderWidth: 2,
                  borderColor: agentType === 'openai' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                  backgroundColor: agentType === 'openai' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                }
              ]}
              activeOpacity={0.8}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '600',
                textAlign: 'center',
              }}>
                OpenAI ({openAIAgents.length})
              </Text>
            </TouchableOpacity>
          </Row>
        </LinearGradient>
      </MotiView>

      {/* Content Area with improved spacing */}
      <View style={{ flex: 1, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.lg }}>
        {/* Enhanced Search and Filter Row */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 200 }}
        >
          <Row gap="sm" style={{ marginBottom: theme.spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder={`Search ${agentType} agents...`}
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftIcon="search"
                variant="outlined"
                borderRadius="lg"
                style={{ backgroundColor: theme.colors.surface }}
              />
            </View>
            
            <TouchableOpacity
              onPress={showFilterMenu}
              style={{
                width: 48,
                height: 48,
                borderRadius: theme.borderRadius.lg,
                backgroundColor: theme.colors.surface,
                borderWidth: 2,
                borderColor: theme.colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="funnel" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={showSortMenu}
              style={{
                width: 48,
                height: 48,
                borderRadius: theme.borderRadius.lg,
                backgroundColor: theme.colors.surface,
                borderWidth: 2,
                borderColor: theme.colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-vertical" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </Row>
        </MotiView>

        {/* Enhanced Agent List */}
        {allFilteredAgents.length > 0 ? (
          <MotiView
            from={{ opacity: 0, translateY: 30 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600, delay: 300 }}
            style={{ flex: 1 }}
          >
            <FlatList
              data={allFilteredAgents as (Agent | OpenAIAgent)[]}
              renderItem={({ item, index }) => 
                agentType === 'standard' 
                  ? renderAgent({ item: item as Agent, index })
                  : renderOpenAIAgent({ item: item as OpenAIAgent, index })
              }
              keyExtractor={item => item.id}
              numColumns={numColumns}
              key={numColumns} // Force re-render when columns change
              columnWrapperStyle={numColumns > 1 ? { gap: theme.spacing.lg } : undefined}
              contentContainerStyle={[
                styles.listContainer,
                {
                  paddingBottom: Platform.OS === 'ios' ? insets.bottom + 120 : 120,
                }
              ]}
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
              contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? "automatic" : undefined}
              ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
            />
          </MotiView>
        ) : (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 400 }}
            style={styles.emptyState}
          >
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: `${theme.colors.primary}10`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.lg,
            }}>
              <Ionicons 
                name={agentType === 'openai' ? 'hardware-chip' : 'desktop'} 
                size={48} 
                color={theme.colors.primary} 
              />
            </View>
            <Text style={[styles.emptyTitle, { fontSize: 24, fontWeight: '700' }]}>
              No {agentType} agents found
            </Text>
            <Text style={[styles.emptySubtitle, { fontSize: 16, lineHeight: 24 }]}>
              {searchQuery 
                ? 'Try adjusting your search terms or filters' 
                : `Create your first ${agentType} agent to get started`
              }
            </Text>
            
            <TouchableOpacity
              onPress={agentType === 'standard' ? handleCreateAgent : handleCreateOpenAIAgent}
              style={{
                backgroundColor: theme.colors.primary,
                paddingHorizontal: theme.spacing.xl,
                paddingVertical: theme.spacing.md,
                borderRadius: theme.borderRadius.lg,
                marginTop: theme.spacing.xl,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Create {agentType === 'standard' ? 'Agent' : 'OpenAI Agent'}
              </Text>
            </TouchableOpacity>
          </MotiView>
        )}

      </View>
      
      {/* iOS-style Floating Action Button */}
      {allFilteredAgents.length > 0 && (
        <MotiView
          from={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 800 }}
          style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? insets.bottom + 100 : 90,
            right: theme.spacing.xl,
          }}
        >
          <TouchableOpacity 
            style={[
              {
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                ...theme.shadows.lg,
              }
            ]}
            onPress={agentType === 'standard' ? handleCreateAgent : handleCreateOpenAIAgent}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </MotiView>
      )}
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
    </Layout>
  );
};

export default AgentsScreen;