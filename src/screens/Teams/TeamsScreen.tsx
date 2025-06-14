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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, SearchBar, StatusBadge, AnimatedView } from '../../components/ui';
import { MotiView } from '../../components/animations';
import { createSharedStyles } from '../../styles/shared';
import { enhancedAgentsService } from '../../services/enhancedAgents';
import { AgentTeam, AgentTeamMember, TeamPerformanceMetrics } from '../../types/agents';
import { AppTheme } from '../../types';

const TeamsScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const sharedStyles = createSharedStyles(theme);

  // State management
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<AgentTeam | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<Record<string, TeamPerformanceMetrics>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await enhancedAgentsService.getTeams();
      setTeams(teamsData);
      
      // Load metrics for each team
      const metrics: Record<string, TeamPerformanceMetrics> = {};
      for (const team of teamsData) {
        try {
          const teamMetric = await enhancedAgentsService.getTeamPerformanceMetrics(team.id);
          metrics[team.id] = teamMetric;
        } catch (error) {
          console.warn(`Failed to load metrics for team ${team.id}:`, error);
        }
      }
      setTeamMetrics(metrics);
    } catch (error) {
      console.error('Error loading teams:', error);
      Alert.alert('Error', 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTeams();
    setRefreshing(false);
  };

  const handleCreateTeam = () => {
    // Navigate to team creation modal
    console.log('Create team');
  };

  const handleTeamPress = (team: AgentTeam) => {
    setSelectedTeam(team);
    // Navigate to team details
    console.log('Team selected:', team.name);
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTeamStatusColor = (status: AgentTeam['status']) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'inactive': return theme.colors.textSecondary;
      case 'paused': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const renderTeamCard = (team: AgentTeam, index: number) => {
    const metrics = teamMetrics[team.id];
    const memberCount = team.members.length;
    const activeMembers = team.members.filter(m => m.status === 'active').length;

    return (
      <MotiView
        key={team.id}
        preset="slideUp"
        delay={index * 100}
        style={viewMode === 'grid' ? styles.teamCard : styles.teamListItem}
      >
        <TouchableOpacity
          style={styles.teamCardContent}
          onPress={() => handleTeamPress(team)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[
              theme.colors.primary + '15',
              theme.colors.secondary + '10'
            ]}
            style={styles.teamCardGradient}
          />
          
          {/* Header */}
          <View style={styles.teamCardHeader}>
            <View style={styles.teamInfo}>
              <View style={styles.teamIcon}>
                <Ionicons 
                  name="people" 
                  size={24} 
                  color={theme.colors.primary} 
                />
              </View>
              <View style={styles.teamDetails}>
                <Text style={styles.teamName} numberOfLines={1}>
                  {team.name}
                </Text>
                <Text style={styles.teamDescription} numberOfLines={2}>
                  {team.description || 'No description'}
                </Text>
              </View>
            </View>
            <StatusBadge 
              status={team.status} 
            />
          </View>

          {/* Members */}
          <View style={styles.teamMembers}>
            <View style={styles.memberAvatars}>
              {team.members.slice(0, 4).map((member, idx) => (
                <View 
                  key={member.id} 
                  style={[
                    styles.memberAvatar,
                    { zIndex: 4 - idx, marginLeft: idx > 0 ? -8 : 0 }
                  ]}
                >
                  <Ionicons 
                    name="person" 
                    size={12} 
                    color={theme.colors.surface} 
                  />
                </View>
              ))}
              {memberCount > 4 && (
                <View style={[styles.memberAvatar, styles.memberAvatarMore]}>
                  <Text style={styles.memberAvatarMoreText}>
                    +{memberCount - 4}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.memberCount}>
              {activeMembers}/{memberCount} active
            </Text>
          </View>

          {/* Metrics */}
          {metrics && (
            <View style={styles.teamMetrics}>
              <View style={styles.metricItem}>
                <Ionicons 
                  name="flash" 
                  size={16} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.metricValue}>
                  {metrics.total_workflow_executions}
                </Text>
                <Text style={styles.metricLabel}>Executions</Text>
              </View>
              <View style={styles.metricItem}>
                <Ionicons 
                  name="trending-up" 
                  size={16} 
                  color={theme.colors.success} 
                />
                <Text style={styles.metricValue}>
                  {Math.round(metrics.collaboration_efficiency_score)}%
                </Text>
                <Text style={styles.metricLabel}>Efficiency</Text>
              </View>
              <View style={styles.metricItem}>
                <Ionicons 
                  name="time" 
                  size={16} 
                  color={theme.colors.warning} 
                />
                <Text style={styles.metricValue}>
                  {Math.round(metrics.average_workflow_completion_time_ms / 1000)}s
                </Text>
                <Text style={styles.metricLabel}>Avg Time</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.teamActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => console.log('Execute workflow')}
            >
              <Ionicons 
                name="play" 
                size={16} 
                color={theme.colors.primary} 
              />
              <Text style={styles.actionButtonText}>Execute</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => console.log('View analytics')}
            >
              <Ionicons 
                name="analytics" 
                size={16} 
                color={theme.colors.secondary} 
              />
              <Text style={styles.actionButtonText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  const renderEmptyState = () => (
    <AnimatedView style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
      </View>
      <Text style={styles.emptyStateTitle}>No Teams Yet</Text>
      <Text style={styles.emptyStateDescription}>
        Create your first team to start collaborating with AI agents
      </Text>
      <Button
        title="Create Team"
        onPress={handleCreateTeam}
        variant="gradient"
        style={styles.emptyStateButton}
        icon={<Ionicons name="add" size={20} color="#FFFFFF" />}
      />
    </AnimatedView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>AI Teams</Text>
            <Text style={styles.headerSubtitle}>
              {teams.length} team{teams.length !== 1 ? 's' : ''} • {
                teams.reduce((sum, team) => sum + team.members.filter(m => m.status === 'active').length, 0)
              } active agents
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={handleCreateTeam}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <SearchBar
          value={searchQuery}
          onSearch={setSearchQuery}
          placeholder="Search teams..."
        />
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={[
              styles.viewToggle,
              viewMode === 'grid' && styles.viewToggleActive
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons 
              name="grid" 
              size={20} 
              color={viewMode === 'grid' ? theme.colors.primary : theme.colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggle,
              viewMode === 'list' && styles.viewToggleActive
            ]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons 
              name="list" 
              size={20} 
              color={viewMode === 'list' ? theme.colors.primary : theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
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
            <Text style={styles.loadingText}>Loading teams...</Text>
          </View>
        ) : filteredTeams.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={viewMode === 'grid' ? styles.teamsGrid : styles.teamsList}>
            {filteredTeams.map(renderTeamCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
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
  headerAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  viewToggleActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
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
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingBottom: 100,
  },
  teamsList: {
    gap: 12,
    paddingBottom: 100,
  },
  teamCard: {
    width: '48%',
    minHeight: 280,
  },
  teamListItem: {
    width: '100%',
    minHeight: 160,
  },
  teamCardContent: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  teamCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  teamCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  teamIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  teamDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  teamMembers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  memberAvatarMore: {
    backgroundColor: theme.colors.textSecondary,
  },
  memberAvatarMoreText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.surface,
  },
  memberCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  teamMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  teamActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface + '80',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
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
});

export default TeamsScreen;