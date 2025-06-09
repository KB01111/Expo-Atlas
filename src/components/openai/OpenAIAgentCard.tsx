import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, StatusBadge, Button } from '../ui';
import { OpenAIAgent } from '../../types/openai';
import { AppTheme } from '../../types';

interface OpenAIAgentCardProps {
  agent: OpenAIAgent;
  onPress?: () => void;
  onExecute?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  agentHeader: {
    marginBottom: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
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
  toolsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  toolTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: theme.colors.secondary + '20',
    borderRadius: 4,
  },
  toolText: {
    fontSize: 10,
    color: theme.colors.secondary,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
});

const OpenAIAgentCard: React.FC<OpenAIAgentCardProps> = ({
  agent,
  onPress,
  onExecute,
  onEdit,
  onDelete
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getToolDisplayName = (tool: any): string => {
    switch (tool.type) {
      case 'code_interpreter':
        return 'Code';
      case 'file_search':
        return 'Files';
      case 'function':
        return tool.function?.name || 'Function';
      default:
        return tool.type;
    }
  };

  return (
    <Card variant="elevated" size="md" pressable onPress={onPress}>
      <View style={styles.agentHeader}>
        <View style={styles.agentInfo}>
          <View style={styles.agentTitleRow}>
            <Ionicons name="hardware-chip" size={20} color="#00A67E" />
            <Text style={styles.agentName}>{agent.name}</Text>
            <StatusBadge status={agent.status} variant="subtle" />
          </View>
          <Text style={styles.agentDescription}>
            {agent.description || 'No description available'}
          </Text>
          <Text style={styles.agentProvider}>
            OpenAI Agents • {agent.model}
          </Text>
          
          {agent.tools.length > 0 && (
            <View style={styles.toolsContainer}>
              {agent.tools.map((tool, index) => (
                <View key={index} style={styles.toolTag}>
                  <Text style={styles.toolText}>
                    {getToolDisplayName(tool)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.agentStats}>
        <View style={styles.statItem}>
          <Ionicons name="hammer" size={16} color={theme.colors.secondary} />
          <Text style={[styles.statValue, { color: theme.colors.secondary }]}>
            {agent.tools.length}
          </Text>
          <Text style={styles.statLabel}>Tools</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="flash" size={16} color={theme.colors.primary} />
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            {agent.executions}
          </Text>
          <Text style={styles.statLabel}>Executions</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {agent.successRate.toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Success</Text>
        </View>
      </View>

      {(onExecute || onEdit || onDelete) && (
        <View style={styles.actionsRow}>
          {onExecute && (
            <Button 
              title="Execute"
              variant="primary" 
              size="xs" 
              onPress={onExecute} 
              style={{ flex: 1 }}
            />
          )}
          {onEdit && (
            <Button 
              title="Edit"
              variant="outline" 
              size="xs" 
              onPress={onEdit} 
              style={{ flex: 1 }}
            />
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={{ padding: 8 }}>
              <Ionicons name="trash" size={14} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
};

export default OpenAIAgentCard;