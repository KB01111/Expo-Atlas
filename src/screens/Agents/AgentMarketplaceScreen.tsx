import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '@clerk/clerk-expo';
import { AppTheme } from '../../types';
import { OneClickAgent, AgentTemplateCategory } from '../../services/agentTemplates';
import { agentTemplatesService } from '../../services/agentTemplates';
import { Card, Button, SearchBar, AnimatedView } from '../../components/ui';
import { createSharedStyles } from '../../styles/shared';

const createStyles = (theme: AppTheme) => StyleSheet.create({
  categoryContainer: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  categoryDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  agentCard: {
    width: 280,
    marginRight: 16,
    marginBottom: 8,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  agentDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  agentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  featuresContainer: {
    marginBottom: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  deployButton: {
    marginTop: 8,
  },
  searchContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

const AgentMarketplaceScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useUser();
  const sharedStyles = createSharedStyles(theme);
  const styles = createStyles(theme);

  const [categories, setCategories] = useState<AgentTemplateCategory[]>([]);
  const [featuredAgents, setFeaturedAgents] = useState<OneClickAgent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OneClickAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployingAgents, setDeployingAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadMarketplaceData = async () => {
    try {
      // Load categories and one-click agents
      const categoriesData = agentTemplatesService.getCategories();
      const featuredData = agentTemplatesService.getOneClickAgents().slice(0, 6);

      setCategories(categoriesData);
      setFeaturedAgents(featuredData);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      const allAgents = agentTemplatesService.getOneClickAgents();
      const results = allAgents.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.features.some(feature => 
          feature.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching agents:', error);
    }
  };

  const handleDeployAgent = async (agentId: string) => {
    console.log('🚀 Deploy button pressed for agent:', agentId);
    
    if (!user) {
      console.log('❌ No user found, showing auth alert');
      Alert.alert('Authentication Required', 'Please sign in to deploy agents.');
      return;
    }

    console.log('✅ User authenticated:', user.id);
    setDeployingAgents(prev => new Set(prev).add(agentId));

    try {
      console.log('🔄 Starting deployment...');
      const deployedAgentId = await agentTemplatesService.deployOneClickAgent(
        agentId,
        user.id
      );
      console.log('✅ Deployment successful, agent ID:', deployedAgentId);

      Alert.alert(
        'Agent Deployed Successfully!',
        `Your AI agent has been deployed and is ready to use. Agent ID: ${deployedAgentId}`,
        [
          {
            text: 'View Agent',
            onPress: () => {
              // Navigate to agent details or agents list
            }
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('❌ Error deploying agent:', error);
      Alert.alert(
        'Deployment Failed',
        `Failed to deploy the agent: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      console.log('🔄 Cleaning up deployment state...');
      setDeployingAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return { backgroundColor: theme.colors.success + '20', color: theme.colors.success };
      case 'intermediate':
        return { backgroundColor: theme.colors.warning + '20', color: theme.colors.warning };
      case 'advanced':
        return { backgroundColor: theme.colors.error + '20', color: theme.colors.error };
      default:
        return { backgroundColor: theme.colors.surface, color: theme.colors.textSecondary };
    }
  };

  const renderOneClickAgent = (agent: OneClickAgent) => {
    const isDeploying = deployingAgents.has(agent.id);
    const difficultyStyle = getDifficultyColor(agent.difficulty);

    return (
      <Card
        key={agent.id}
        variant="elevated"
        size="md"
        style={styles.agentCard}
      >
        <View style={styles.agentHeader}>
          <View style={styles.agentIcon}>
            <Ionicons name={agent.icon as any} size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <View style={styles.agentMeta}>
              <View style={[styles.difficultyBadge, difficultyStyle]}>
                <Text style={[styles.difficultyText, { color: difficultyStyle.color }]}>
                  {agent.difficulty}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={12} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{agent.setup_time}m setup</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.agentDescription}>{agent.description}</Text>

        <View style={styles.featuresContainer}>
          {agent.features.slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.feature}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
          {agent.features.length > 3 && (
            <Text style={[styles.featureText, { fontStyle: 'italic' }]}>
              +{agent.features.length - 3} more features
            </Text>
          )}
        </View>

        <Button
          title={isDeploying ? 'Deploying...' : 'Deploy Now'}
          variant="primary"
          size="sm"
          onPress={() => {
            console.log('🔥 Button onPress fired for agent:', agent.id);
            handleDeployAgent(agent.id);
          }}
          disabled={isDeploying}
          style={styles.deployButton}
          icon={isDeploying ? undefined : 'rocket'}
        />
      </Card>
    );
  };

  const renderCategory = (category: AgentTemplateCategory) => {
    const categoryAgents = agentTemplatesService.getOneClickAgents(category.id);

    if (categoryAgents.length === 0) return null;

    return (
      <View key={category.id} style={styles.categoryContainer}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
            <Ionicons name={category.icon as any} size={20} color={category.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.categoryTitle}>{category.name}</Text>
            <Text style={styles.categoryDescription}>{category.description}</Text>
          </View>
        </View>

        <FlatList
          horizontal
          data={categoryAgents}
          renderItem={({ item }) => renderOneClickAgent(item)}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[sharedStyles.container, sharedStyles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[sharedStyles.body, { textAlign: 'center', marginTop: 16 }]}>
          Loading AI Agent Marketplace...
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
        <Text style={sharedStyles.headerTitle}>Agent Marketplace</Text>
        <Text style={sharedStyles.headerSubtitle}>Deploy AI agents with one click</Text>
      </LinearGradient>

      <ScrollView 
        style={sharedStyles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <SearchBar
            placeholder="Search AI agents..."
            onSearch={setSearchQuery}
            value={searchQuery}
          />
        </View>

        {searchQuery.trim() ? (
          // Search Results
          <View>
            <Text style={styles.sectionTitle}>
              Search Results ({searchResults.length})
            </Text>
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={({ item, index }) => (
                  <AnimatedView animation="slideUp" delay={index * 50}>
                    {renderOneClickAgent(item)}
                  </AnimatedView>
                )}
                keyExtractor={item => item.id}
                numColumns={1}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyTitle}>No agents found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search terms or browse by category
                </Text>
              </View>
            )}
          </View>
        ) : (
          // Categories and Featured
          <>
            {/* Featured Agents */}
            <View style={styles.categoryContainer}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name="star" size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryTitle}>Featured Agents</Text>
                  <Text style={styles.categoryDescription}>Popular and trending AI agents</Text>
                </View>
              </View>

              <FlatList
                horizontal
                data={featuredAgents}
                renderItem={({ item }) => renderOneClickAgent(item)}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
              />
            </View>

            {/* Categories */}
            {categories.map(renderCategory)}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default AgentMarketplaceScreen;