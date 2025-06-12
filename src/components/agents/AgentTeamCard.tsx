import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { StatusBadge } from '../ui';
import { MotiView } from '../animations';
import { AgentTeam, TeamPerformanceMetrics } from '../../types/agents';
import { AppTheme } from '../../types';

interface AgentTeamCardProps {
  team: AgentTeam;
  metrics?: TeamPerformanceMetrics;
  onPress: (team: AgentTeam) => void;
  onExecute: (team: AgentTeam) => void;
  animationDelay?: number;
  compact?: boolean;
}

const { width } = Dimensions.get('window');

const AgentTeamCard: React.FC<AgentTeamCardProps> = ({
  team,
  metrics,
  onPress,
  onExecute,
  animationDelay = 0,
  compact = false
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, compact);

  const activeMembers = team.members.filter(m => m.status === 'active').length;
  const totalMembers = team.members.length;

  const getStatusColor = (status: AgentTeam['status']) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'inactive': return theme.colors.textSecondary;
      case 'paused': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return 'star';
      case 'specialist': return 'build';
      case 'observer': return 'eye';
      default: return 'person';
    }
  };

  const roleDistribution = team.members.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <MotiView
      preset="slideUp"
      delay={animationDelay}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(team)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[
            theme.colors.primary + '12',
            theme.colors.secondary + '08'
          ]}
          style={styles.gradient}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.teamInfo}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.iconGradient}
              >
                <Ionicons 
                  name="people" 
                  size={compact ? 20 : 24} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </View>
            <View style={styles.teamDetails}>
              <Text style={styles.teamName} numberOfLines={1}>
                {team.name}
              </Text>
              {!compact && team.description && (
                <Text style={styles.teamDescription} numberOfLines={2}>
                  {team.description}
                </Text>
              )}
            </View>
          </View>
          <StatusBadge 
            status={team.status} 
          />
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <View style={styles.memberStats}>
            <View style={styles.memberAvatars}>
              {team.members.slice(0, compact ? 3 : 4).map((member, index) => (
                <View 
                  key={member.id}
                  style={[
                    styles.memberAvatar,
                    { 
                      zIndex: 10 - index,
                      marginLeft: index > 0 ? -6 : 0,
                      backgroundColor: member.status === 'active' 
                        ? theme.colors.primary 
                        : theme.colors.textSecondary
                    }
                  ]}
                >
                  <Ionicons 
                    name={getRoleIcon(member.role)} 
                    size={compact ? 8 : 10} 
                    color="#FFFFFF" 
                  />
                </View>
              ))}
              {totalMembers > (compact ? 3 : 4) && (
                <View style={[styles.memberAvatar, styles.memberAvatarMore]}>
                  <Text style={styles.memberAvatarMoreText}>
                    +{totalMembers - (compact ? 3 : 4)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.memberCount}>
              {activeMembers}/{totalMembers} active
            </Text>
          </View>

          {!compact && (
            <View style={styles.roleDistribution}>
              {Object.entries(roleDistribution).map(([role, count]) => (
                <View key={role} style={styles.roleItem}>
                  <Ionicons 
                    name={getRoleIcon(role)} 
                    size={12} 
                    color={theme.colors.textSecondary} 
                  />
                  <Text style={styles.roleCount}>{count}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Metrics */}
        {metrics && !compact && (
          <View style={styles.metricsSection}>
            <View style={styles.metricItem}>
              <View style={styles.metricIcon}>
                <Ionicons 
                  name="flash" 
                  size={14} 
                  color={theme.colors.primary} 
                />
              </View>
              <Text style={styles.metricValue}>
                {metrics.total_workflow_executions}
              </Text>
              <Text style={styles.metricLabel}>Executions</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={styles.metricIcon}>
                <Ionicons 
                  name="trending-up" 
                  size={14} 
                  color={theme.colors.success} 
                />
              </View>
              <Text style={styles.metricValue}>
                {Math.round(metrics.collaboration_efficiency_score)}%
              </Text>
              <Text style={styles.metricLabel}>Efficiency</Text>
            </View>
            <View style={styles.metricItem}>
              <View style={styles.metricIcon}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={14} 
                  color={theme.colors.success} 
                />
              </View>
              <Text style={styles.metricValue}>
                {Math.round((metrics.successful_workflow_executions / Math.max(metrics.total_workflow_executions, 1)) * 100)}%
              </Text>
              <Text style={styles.metricLabel}>Success</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.executeButton]}
            onPress={() => onExecute(team)}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              style={styles.actionButtonGradient}
            >
              <Ionicons 
                name="play" 
                size={compact ? 14 : 16} 
                color="#FFFFFF" 
              />
              <Text style={styles.executeButtonText}>Execute</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onPress(team)}
          >
            <Ionicons 
              name="settings-outline" 
              size={compact ? 14 : 16} 
              color={theme.colors.text} 
            />
            <Text style={styles.actionButtonText}>Configure</Text>
          </TouchableOpacity>
        </View>

        {/* Workflow Indicator */}
        {team.workflow && (
          <View style={styles.workflowIndicator}>
            <Ionicons 
              name="git-network" 
              size={12} 
              color={theme.colors.secondary} 
            />
            <Text style={styles.workflowText}>
              Workflow: {team.workflow.name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </MotiView>
  );
};

const createStyles = (theme: AppTheme, compact: boolean) => StyleSheet.create({
  container: {
    width: compact ? width * 0.85 : width * 0.45,
    marginBottom: compact ? 8 : 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: compact ? 12 : 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: compact ? 12 : 16,
    paddingBottom: compact ? 8 : 12,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: compact ? 8 : 12,
  },
  iconContainer: {
    borderRadius: compact ? 20 : 24,
    overflow: 'hidden',
  },
  iconGradient: {
    width: compact ? 40 : 48,
    height: compact ? 40 : 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: compact ? 16 : 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: compact ? 2 : 4,
  },
  teamDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  membersSection: {
    paddingHorizontal: compact ? 12 : 16,
    paddingBottom: compact ? 8 : 12,
    gap: compact ? 6 : 8,
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: compact ? 20 : 24,
    height: compact ? 20 : 24,
    borderRadius: compact ? 10 : 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  memberAvatarMore: {
    backgroundColor: theme.colors.textSecondary,
  },
  memberAvatarMoreText: {
    fontSize: compact ? 8 : 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberCount: {
    fontSize: compact ? 11 : 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  roleDistribution: {
    flexDirection: 'row',
    gap: 8,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  roleCount: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  metricsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '30',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
  },
  metricIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  metricLabel: {
    fontSize: 9,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '50',
  },
  actionButton: {
    flex: 1,
    height: compact ? 40 : 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: compact ? 4 : 6,
  },
  executeButton: {
    borderRightWidth: 1,
    borderRightColor: theme.colors.border + '50',
    overflow: 'hidden',
  },
  actionButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: compact ? 4 : 6,
  },
  executeButtonText: {
    fontSize: compact ? 12 : 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonText: {
    fontSize: compact ? 12 : 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  workflowIndicator: {
    position: 'absolute',
    top: compact ? 8 : 12,
    right: compact ? 8 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.secondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  workflowText: {
    fontSize: 9,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
});

export default AgentTeamCard;