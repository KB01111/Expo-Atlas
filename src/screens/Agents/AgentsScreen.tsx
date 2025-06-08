import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { supabaseService } from '../../services/supabase';
import { Agent } from '../../types';
import { Card, StatusBadge, AnimatedView, SearchBar } from '../../components/ui';
import { createSharedStyles } from '../../styles/shared';
import AgentModal from '../../components/modals/AgentModal';

const AgentsScreen: React.FC = () => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const loadAgents = async () => {
    try {
      const data = await supabaseService.getAgents();
      setAgents(data);
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

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setShowModal(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.colors.success;
      case 'inactive':
        return theme.colors.textSecondary;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderAgent = ({ item, index }: { item: Agent; index: number }) => (
    <AnimatedView animation="slideUp" delay={index * 100}>
      <Card variant="default" onPress={() => console.log('Agent pressed:', item.id)}>
        <View style={sharedStyles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={sharedStyles.subtitle}>
              {item.name}
            </Text>
            <Text style={sharedStyles.caption}>
              {item.description || 'No description available'}
            </Text>
          </View>
          <StatusBadge status={item.status} variant="subtle" />
        </View>

        <View style={[sharedStyles.row, sharedStyles.gapLG, { marginTop: theme.spacing.md }]}>
          <View style={sharedStyles.center}>
            <Text style={[sharedStyles.title, { color: theme.colors.primary, fontSize: 20 }]}>
              {item.tasks || 0}
            </Text>
            <Text style={sharedStyles.label}>
              Tasks
            </Text>
          </View>
          <View style={sharedStyles.center}>
            <Text style={[sharedStyles.title, { color: theme.colors.success, fontSize: 20 }]}>
              {(item.successRate || 0).toFixed(1)}%
            </Text>
            <Text style={sharedStyles.label}>
              Success Rate
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditAgent(item)}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Card>
    </AnimatedView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Agents</Text>
        <Text style={styles.headerSubtitle}>Manage your AI agents</Text>
      </LinearGradient>

      <View style={sharedStyles.content}>
        <SearchBar
          placeholder="Search agents..."
          onSearch={setSearchQuery}
          value={searchQuery}
        />

        <FlatList
          data={filteredAgents}
          renderItem={renderAgent}
          keyExtractor={item => item.id}
          contentContainerStyle={sharedStyles.gapMD}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity style={sharedStyles.fab} onPress={handleCreateAgent}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <AgentModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveAgent}
        agent={selectedAgent}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  list: {
    gap: 12,
    paddingBottom: 80,
  },
  agentCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  agentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default AgentsScreen;