import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button, Modal } from '../ui';
import { MotiView } from '../animations';
import { enhancedAgentsService } from '../../services/enhancedAgents';
import { supabaseService } from '../../services/supabase';
import { AgentTeam, AgentTeamMember } from '../../types/agents';
import { OpenAIAgent } from '../../types/openai';
import { AppTheme } from '../../types';

interface TeamCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onTeamCreated: (team: AgentTeam) => void;
  editingTeam?: AgentTeam;
}

const TeamCreationModal: React.FC<TeamCreationModalProps> = ({
  visible,
  onClose,
  onTeamCreated,
  editingTeam
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [agentRoles, setAgentRoles] = useState<Record<string, AgentTeamMember['role']>>({});
  
  // Data state
  const [availableAgents, setAvailableAgents] = useState<OpenAIAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadAvailableAgents();
      
      if (editingTeam) {
        setTeamName(editingTeam.name);
        setTeamDescription(editingTeam.description || '');
        setSelectedAgents(editingTeam.members.map(m => m.agent_id));
        
        const roles: Record<string, AgentTeamMember['role']> = {};
        editingTeam.members.forEach(member => {
          roles[member.agent_id] = member.role;
        });
        setAgentRoles(roles);
      } else {
        resetForm();
      }
    }
  }, [visible, editingTeam]);

  const loadAvailableAgents = async () => {
    try {
      setLoading(true);
      const agents = await supabaseService.getAgents();
      setAvailableAgents(agents);
    } catch (error) {
      console.error('Error loading agents:', error);
      Alert.alert('Error', 'Failed to load available agents');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTeamName('');
    setTeamDescription('');
    setSelectedAgents([]);
    setAgentRoles({});
  };

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev => {
      if (prev.includes(agentId)) {
        // Remove agent
        const newRoles = { ...agentRoles };
        delete newRoles[agentId];
        setAgentRoles(newRoles);
        return prev.filter(id => id !== agentId);
      } else {
        // Add agent with default role
        setAgentRoles(prev => ({ ...prev, [agentId]: 'collaborator' }));
        return [...prev, agentId];
      }
    });
  };

  const handleRoleChange = (agentId: string, role: AgentTeamMember['role']) => {
    setAgentRoles(prev => ({ ...prev, [agentId]: role }));
  };

  const handleSave = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Team name is required');
      return;
    }

    if (selectedAgents.length === 0) {
      Alert.alert('Error', 'Please select at least one agent for the team');
      return;
    }

    try {
      setSaving(true);

      const members: AgentTeamMember[] = selectedAgents.map(agentId => ({
        id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        agent_id: agentId,
        role: agentRoles[agentId] || 'collaborator',
        capabilities: [], // TODO: Auto-detect from agent
        priority: 1,
        status: 'active',
        added_at: new Date().toISOString()
      }));

      if (editingTeam) {
        // Update existing team
        const updatedTeam = await enhancedAgentsService.updateTeam(editingTeam.id, {
          name: teamName,
          description: teamDescription,
          members,
          updated_at: new Date().toISOString()
        });
        onTeamCreated(updatedTeam);
      } else {
        // Create new team
        const newTeam = await enhancedAgentsService.createTeam({
          name: teamName,
          description: teamDescription,
          members,
          status: 'active',
          owner_id: 'current_user', // TODO: Get from auth context
          metadata: {
            created_by: 'user',
            creation_method: 'manual'
          }
        });
        onTeamCreated(newTeam);
      }

      onClose();
      resetForm();
    } catch (error) {
      console.error('Error saving team:', error);
      Alert.alert('Error', 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = (role: AgentTeamMember['role']) => {
    switch (role) {
      case 'leader': return 'star';
      case 'collaborator': return 'people';
      case 'specialist': return 'build';
      case 'observer': return 'eye';
      default: return 'person';
    }
  };

  const getRoleColor = (role: AgentTeamMember['role']) => {
    switch (role) {
      case 'leader': return theme.colors.warning;
      case 'collaborator': return theme.colors.primary;
      case 'specialist': return theme.colors.secondary;
      case 'observer': return theme.colors.textSecondary;
      default: return theme.colors.primary;
    }
  };

  const renderAgentItem = (agent: OpenAIAgent, index: number) => {
    const isSelected = selectedAgents.includes(agent.id);
    const role = agentRoles[agent.id] || 'collaborator';

    return (
      <MotiView
        key={agent.id}
        preset="slideRight"
        delay={index * 50}
        style={styles.agentItem}
      >
        <TouchableOpacity
          style={[
            styles.agentCard,
            isSelected && styles.agentCardSelected
          ]}
          onPress={() => handleAgentToggle(agent.id)}
          activeOpacity={0.7}
        >
          <View style={styles.agentInfo}>
            <View style={[
              styles.agentAvatar,
              { backgroundColor: isSelected ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              <Ionicons 
                name="person" 
                size={20} 
                color={theme.colors.surface} 
              />
            </View>
            <View style={styles.agentDetails}>
              <Text style={styles.agentName} numberOfLines={1}>
                {agent.name}
              </Text>
              <Text style={styles.agentModel} numberOfLines={1}>
                {agent.model} • {agent.status}
              </Text>
            </View>
          </View>

          {isSelected && (
            <View style={styles.roleSelector}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.roleOptions}
              >
                {(['leader', 'collaborator', 'specialist', 'observer'] as const).map(roleOption => (
                  <TouchableOpacity
                    key={roleOption}
                    style={[
                      styles.roleOption,
                      role === roleOption && styles.roleOptionSelected,
                      { borderColor: getRoleColor(roleOption) }
                    ]}
                    onPress={() => handleRoleChange(agent.id, roleOption)}
                  >
                    <Ionicons 
                      name={getRoleIcon(roleOption)} 
                      size={14} 
                      color={role === roleOption ? '#FFFFFF' : getRoleColor(roleOption)} 
                    />
                    <Text style={[
                      styles.roleOptionText,
                      role === roleOption && styles.roleOptionTextSelected
                    ]}>
                      {roleOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.agentCheckbox}>
            {isSelected ? (
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color={theme.colors.primary} 
              />
            ) : (
              <View style={styles.uncheckedCircle} />
            )}
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editingTeam ? 'Edit Team' : 'Create New Team'}
      size="large"
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Team Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Team Name</Text>
            <TextInput
              style={styles.textInput}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Enter team name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={teamDescription}
              onChangeText={setTeamDescription}
              placeholder="Describe the team's purpose and goals"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Team Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            <Text style={styles.sectionSubtitle}>
              {selectedAgents.length} of {availableAgents.length} agents selected
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading agents...</Text>
            </View>
          ) : availableAgents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateText}>No agents available</Text>
            </View>
          ) : (
            <View style={styles.agentsList}>
              {availableAgents.map(renderAgentItem)}
            </View>
          )}
        </View>

        {/* Summary Section */}
        {selectedAgents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Summary</Text>
            
            <Card style={styles.summaryCard}>
              <LinearGradient
                colors={[theme.colors.primary + '10', theme.colors.secondary + '05']}
                style={styles.summaryGradient}
              />
              
              <View style={styles.summaryContent}>
                <View style={styles.summaryItem}>
                  <Ionicons name="people" size={20} color={theme.colors.primary} />
                  <Text style={styles.summaryLabel}>Total Members</Text>
                  <Text style={styles.summaryValue}>{selectedAgents.length}</Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Ionicons name="star" size={20} color={theme.colors.warning} />
                  <Text style={styles.summaryLabel}>Leaders</Text>
                  <Text style={styles.summaryValue}>
                    {Object.values(agentRoles).filter(role => role === 'leader').length}
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Ionicons name="build" size={20} color={theme.colors.secondary} />
                  <Text style={styles.summaryLabel}>Specialists</Text>
                  <Text style={styles.summaryValue}>
                    {Object.values(agentRoles).filter(role => role === 'specialist').length}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Cancel"
          onPress={onClose}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title={saving ? 'Saving...' : (editingTeam ? 'Update Team' : 'Create Team')}
          onPress={handleSave}
          variant="gradient"
          disabled={saving || !teamName.trim() || selectedAgents.length === 0}
          loading={saving}
          style={styles.actionButton}
        />
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  agentsList: {
    gap: 12,
  },
  agentItem: {
    marginBottom: 2,
  },
  agentCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  agentCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentDetails: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  agentModel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  agentCheckbox: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  uncheckedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  roleSelector: {
    marginTop: 8,
  },
  roleOptions: {
    flexDirection: 'row',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  roleOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  roleOptionTextSelected: {
    color: '#FFFFFF',
  },
  summaryCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  summaryGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
  },
});

export default TeamCreationModal;