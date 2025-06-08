import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { createSharedStyles } from '../../styles/shared';
import { Card, SearchBar, StatusBadge, AnimatedView } from '../../components/ui';
import { supabaseService } from '../../services/supabase';
import { Agent, Workflow, Execution, User } from '../../types';

const SearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const sharedStyles = createSharedStyles(theme);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    agents: Agent[];
    workflows: Workflow[];
    executions: Execution[];
    users: User[];
  }>({
    agents: [],
    workflows: [],
    executions: [],
    users: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'agents' | 'workflows' | 'executions' | 'users'>('all');

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ agents: [], workflows: [], executions: [], users: [] });
      return;
    }

    setLoading(true);
    try {
      const results = await supabaseService.searchAll(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultCount = () => {
    const { agents, workflows, executions, users } = searchResults;
    return agents.length + workflows.length + executions.length + users.length;
  };

  const getFilteredResults = () => {
    switch (activeTab) {
      case 'agents':
        return searchResults.agents.map(item => ({ ...item, type: 'agent' }));
      case 'workflows':
        return searchResults.workflows.map(item => ({ ...item, type: 'workflow' }));
      case 'executions':
        return searchResults.executions.map(item => ({ ...item, type: 'execution' }));
      case 'users':
        return searchResults.users.map(item => ({ ...item, type: 'user' }));
      default:
        return [
          ...searchResults.agents.map(item => ({ ...item, type: 'agent' })),
          ...searchResults.workflows.map(item => ({ ...item, type: 'workflow' })),
          ...searchResults.executions.map(item => ({ ...item, type: 'execution' })),
          ...searchResults.users.map(item => ({ ...item, type: 'user' })),
        ];
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'agent':
        return 'person';
      case 'workflow':
        return 'git-network';
      case 'execution':
        return 'play-circle';
      case 'user':
        return 'people';
      default:
        return 'document';
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'agent':
        return theme.colors.primary;
      case 'workflow':
        return theme.colors.secondary;
      case 'execution':
        return theme.colors.warning;
      case 'user':
        return theme.colors.success;
      default:
        return theme.colors.textSecondary;
    }
  };

  const renderTab = (tab: typeof activeTab, label: string, count: number) => (
    <TouchableOpacity
      style={[
        styles.tab,
        { backgroundColor: activeTab === tab ? theme.colors.primary : theme.colors.surface }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabText,
        { color: activeTab === tab ? '#FFFFFF' : theme.colors.text }
      ]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[
          styles.tabBadge,
          { backgroundColor: activeTab === tab ? 'rgba(255, 255, 255, 0.3)' : theme.colors.primary }
        ]}>
          <Text style={[
            styles.tabBadgeText,
            { color: activeTab === tab ? '#FFFFFF' : '#FFFFFF' }
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item, index }: { item: any; index: number }) => (
    <AnimatedView animation="slideUp" delay={index * 50}>
      <Card variant="default" onPress={() => console.log('Result pressed:', item)}>
        <View style={styles.resultHeader}>
          <View style={styles.resultIcon}>
            <Ionicons
              name={getIconForType(item.type) as any}
              size={20}
              color={getColorForType(item.type)}
            />
          </View>
          <View style={styles.resultContent}>
            <Text style={sharedStyles.subtitle}>
              {item.name || item.full_name || `${item.type} ${item.id?.slice(0, 8)}`}
            </Text>
            <Text style={[sharedStyles.body, { opacity: 0.7 }]}>
              {item.description || item.email || item.input?.slice(0, 100) || 'No description'}
            </Text>
          </View>
          <View style={styles.resultMeta}>
            <Text style={[styles.resultType, { color: getColorForType(item.type) }]}>
              {item.type.toUpperCase()}
            </Text>
            {item.status && (
              <StatusBadge status={item.status} variant="subtle" />
            )}
          </View>
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
        <Text style={styles.headerTitle}>Search</Text>
        <Text style={styles.headerSubtitle}>Find anything across your workspace</Text>
      </LinearGradient>

      <View style={styles.content}>
        <SearchBar
          placeholder="Search agents, workflows, executions..."
          onSearch={handleSearch}
          value={searchQuery}
          autoFocus
        />

        {searchQuery && (
          <Text style={[sharedStyles.body, { marginVertical: 16 }]}>
            {loading ? 'Searching...' : `Found ${getResultCount()} results for "${searchQuery}"`}
          </Text>
        )}

        {searchQuery && !loading && getResultCount() > 0 && (
          <View style={styles.tabs}>
            {renderTab('all', 'All', getResultCount())}
            {renderTab('agents', 'Agents', searchResults.agents.length)}
            {renderTab('workflows', 'Workflows', searchResults.workflows.length)}
            {renderTab('executions', 'Executions', searchResults.executions.length)}
            {renderTab('users', 'Users', searchResults.users.length)}
          </View>
        )}

        <FlatList
          data={getFilteredResults()}
          renderItem={renderSearchResult}
          keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            searchQuery && !loading ? (
              <View style={[sharedStyles.center, { paddingVertical: 40 }]}>
                <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
                <Text style={[sharedStyles.body, { marginTop: 16, textAlign: 'center' }]}>
                  No results found for "{searchQuery}"
                </Text>
                <Text style={[sharedStyles.caption, { textAlign: 'center' }]}>
                  Try a different search term
                </Text>
              </View>
            ) : !searchQuery ? (
              <View style={[sharedStyles.center, { paddingVertical: 40 }]}>
                <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[sharedStyles.body, { marginTop: 16, textAlign: 'center' }]}>
                  Start typing to search
                </Text>
                <Text style={[sharedStyles.caption, { textAlign: 'center' }]}>
                  Search across agents, workflows, executions, and users
                </Text>
              </View>
            ) : null
          }
        />
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
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultsList: {
    gap: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
    gap: 4,
  },
  resultMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  resultType: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default SearchScreen;