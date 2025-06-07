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

const AgentsScreen: React.FC = () => {
  const { theme } = useTheme();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const renderAgent = ({ item }: { item: Agent }) => (
    <TouchableOpacity style={[styles.agentCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.agentHeader}>
        <View style={styles.agentInfo}>
          <Text style={[styles.agentName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.agentDescription, { color: theme.colors.textSecondary }]}>
            {item.description}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.agentStats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {item.tasks}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Tasks
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {item.successRate.toFixed(1)}%
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Success Rate
          </Text>
        </View>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Agents</Text>
        <Text style={styles.headerSubtitle}>Manage your AI agents</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search agents..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredAgents}
          renderItem={renderAgent}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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