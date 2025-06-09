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
import { Agent, AppTheme } from '../../types';
import { Card, StatusBadge, AnimatedView, SearchBar } from '../../components/ui';
import { createSharedStyles } from '../../styles/shared';
import AgentModal from '../../components/modals/AgentModal';

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
          <View style={styles.emptyState}>
            <Ionicons name="robot" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No agents found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'Create your first AI agent'}
            </Text>
          </View>
        )}

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

export default AgentsScreen;